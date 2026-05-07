import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  useListAdminPayments,
  useApprovePayment,
  useRejectPayment,
  getListAdminPaymentsQueryKey,
  getGetPaymentSummaryQueryKey,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import type { Payment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  ImageIcon,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusBadge: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-muted text-muted-foreground",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const methodLabel: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  online: "Online",
};

type FilterStatus = "pending" | "approved" | "rejected" | "all";

function ReceiptPreview({ url }: { url: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className="block w-12 h-12 rounded-lg overflow-hidden border border-border bg-muted hover:ring-2 hover:ring-primary transition-all shrink-0"
        title="View receipt"
      >
        <img
          src={url}
          alt="Receipt"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            e.currentTarget.parentElement!.classList.add("flex", "items-center", "justify-center");
          }}
        />
        <ImageIcon className="w-5 h-5 text-muted-foreground hidden" />
      </button>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted rounded-xl overflow-hidden max-h-[70vh]">
            <img
              src={url}
              alt="Receipt"
              className="max-w-full max-h-[65vh] object-contain"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLightboxOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                Open Full Size
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RejectDialog({
  payment,
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setReason(""); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            Reject Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {payment && (
            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student</span>
                <span className="font-medium">{payment.studentName ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">${Number(payment.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span>{methodLabel[payment.method] ?? payment.method}</span>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Rejection Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Receipt unclear, wrong amount, incorrect account..."
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setReason(""); }} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Rejecting..." : "Reject Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPayments() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);

  const { data: payments, isLoading } = useListAdminPayments(
    filter === "all" ? undefined : { status: filter },
    {
      query: {
        queryKey: getListAdminPaymentsQueryKey(filter === "all" ? undefined : { status: filter }),
        refetchInterval: 15_000,
      },
    }
  );

  const { data: pendingPayments } = useListAdminPayments(
    { status: "pending" },
    { query: { queryKey: getListAdminPaymentsQueryKey({ status: "pending" }), refetchInterval: 15_000 } }
  );
  const pendingCount = pendingPayments?.length ?? 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
    qc.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey({ status: "pending" }) });
    qc.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey({ status: "approved" }) });
    qc.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey({ status: "rejected" }) });
    qc.invalidateQueries({ queryKey: getGetPaymentSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
  };

  const approve = useApprovePayment({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast.success("Payment approved — student is now active");
      },
      onError: () => toast.error("Failed to approve payment"),
    },
  });

  const reject = useRejectPayment({
    mutation: {
      onSuccess: () => {
        invalidate();
        setRejectTarget(null);
        toast.success("Payment rejected");
      },
      onError: () => toast.error("Failed to reject payment"),
    },
  });

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: "pending", label: t("pending") },
    { key: "approved", label: t("approved") },
    { key: "rejected", label: t("rejected") },
    { key: "all", label: t("all") },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("adminPayments")}</h1>
            <p className="text-xs text-muted-foreground">{t("adminPaymentsDesc")}</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {pendingCount} {t("awaitingReview")}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "relative px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
              filter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-accent/40"
            )}
          >
            {label}
            {key === "pending" && pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !payments || payments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {filter === "pending" ? t("noPendingPayments") : t("noData")}
            </p>
            {filter === "pending" && (
              <p className="text-xs mt-1 opacity-70">{t("noPendingPaymentsDesc")}</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground w-12">
                    {t("receipt")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">
                    {t("students")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">
                    {t("course")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">
                    {t("amount")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">
                    {t("method")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">
                    {t("status")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">
                    {t("date")}
                  </th>
                  {(filter === "pending" || filter === "all") && (
                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">
                      {t("actions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      {p.receiptUrl ? (
                        <ReceiptPreview url={p.receiptUrl} />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{p.studentName ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-36 truncate">
                      {p.courseName ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      ${Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {methodLabel[p.method] ?? p.method}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          statusBadge[p.status] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {t(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    {(filter === "pending" || filter === "all") && (
                      <td className="px-4 py-3">
                        {p.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => approve.mutate({ id: p.id })}
                              disabled={approve.isPending || reject.isPending}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                              title="Approve payment"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {t("approve")}
                            </button>
                            <button
                              onClick={() => setRejectTarget(p)}
                              disabled={approve.isPending || reject.isPending}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                              title="Reject payment"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {t("reject")}
                            </button>
                          </div>
                        )}
                        {p.status !== "pending" && (
                          <span className="text-xs text-muted-foreground italic">
                            {p.status === "approved" ? t("approved") : t("rejected")}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RejectDialog
        payment={rejectTarget}
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) =>
          rejectTarget && reject.mutate({ id: rejectTarget.id, data: { reason } })
        }
        isPending={reject.isPending}
      />
    </div>
  );
}
