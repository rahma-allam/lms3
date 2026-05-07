import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface JoinCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: any;
}

export function JoinCourseModal({ isOpen, onClose, course }: JoinCourseModalProps) {
  const [formData, setFormData] = useState({ parentName: "", childName: "", phone: "" });

  const sendToWhatsApp = () => {
  const academyNumber = "2010XXXXXXXX";
  const isGeneralJoin = !course; // هل الضغطة من الـ Nav؟

  const message = isGeneralJoin 
    ? `السلام عليكم، أريد الاستفسار عن الانضمام لأكاديمية سعي 🚀
*بيانات التواصل:*
- اسم ولي الأمر: ${formData.parentName}
- اسم الطفل: ${formData.childName}
- رقم التواصل: ${formData.phone}
---
أريد المساعدة في اختيار الكورس المناسب لطفلي.`
    : `السلام عليكم، أريد الانضمام لكورس: ${course?.titleAr || course?.title} ...`; // الرسالة القديمة

  const whatsappUrl = `https://wa.me/+201113964910?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
  onClose(); 
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rtl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-2xl font-bold">حجز مكان في الدورة</DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            سجل بياناتك وسنقوم بالتواصل معك عبر واتساب لتأكيد الحجز في كورس:
            <br />
            <span className="font-bold text-primary">{course?.titleAr || course?.title}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="parentName" className="text-right">اسم ولي الأمر</Label>
            <Input 
              id="parentName" 
              className="text-right"
              placeholder="الاسم الثلاثي" 
              onChange={(e) => setFormData({...formData, parentName: e.target.value})}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="childName" className="text-right">اسم الطفل وعمره</Label>
            <Input 
              id="childName" 
              className="text-right"
              placeholder="مثال: أحمد - 10 سنوات" 
              onChange={(e) => setFormData({...formData, childName: e.target.value})}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone" className="text-right">رقم الواتساب</Label>
            <Input 
              id="phone" 
              type="tel" 
              className="text-right"
              placeholder="01xxxxxxxxx" 
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
        </div>

        <Button 
          onClick={sendToWhatsApp} 
          disabled={!formData.parentName || !formData.phone}
          className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          تأكيد الحجز عبر واتساب
        </Button>
      </DialogContent>
    </Dialog>
  );
}