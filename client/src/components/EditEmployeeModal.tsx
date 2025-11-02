import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Employee = {
  id: string;
  full_name: string;
  position: string;
  telegram_user_id: string | null;
  status: string;
  tz: string;
};

interface EditEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess?: () => void;
}

// Template avatars - images should be placed in /public/avatars/ folder
// Expected files: avatar-1.png, avatar-2.png, ..., avatar-8.png
const TEMPLATE_AVATARS = [
  { id: 1, image: "/avatars/avatar-1.png" },
  { id: 2, image: "/avatars/avatar-2.png" },
  { id: 3, image: "/avatars/avatar-3.png" },
  { id: 4, image: "/avatars/avatar-4.png" },
  { id: 5, image: "/avatars/avatar-5.png" },
  { id: 6, image: "/avatars/avatar-6.png" },
  { id: 7, image: "/avatars/avatar-7.png" },
  { id: 8, image: "/avatars/avatar-8.png" },
];

export function EditEmployeeModal({ open, onOpenChange, employee, onSuccess }: EditEmployeeModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  // Update form when employee changes
  useEffect(() => {
    if (employee) {
      const nameParts = employee.full_name.split(' ');
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(' ') || "");
      setPosition(employee.position);
      setPhoto(null);
      setPhotoFile(null);
      setSelectedAvatarId(null);
    }
  }, [employee]);

  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: { full_name: string; position: string; photo?: File; avatarId?: number | null }) => {
      if (!employee) return;
      
      // TODO: Implement photo upload and avatar selection endpoint
      // For now, only send JSON data (photo upload and avatar selection will be implemented separately)
      const body: { full_name: string; position: string; avatar_id?: number } = {
        full_name: data.full_name,
        position: data.position,
      };
      
      if (data.avatarId) {
        body.avatar_id = data.avatarId;
      }
      
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка обновления сотрудника");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "employees"] });
      
      toast({
        title: "Успешно",
        description: "Профиль сотрудника обновлен",
      });
      
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Ошибка",
          description: "Размер файла не должен превышать 5 МБ",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Ошибка",
          description: "Выберите изображение",
          variant: "destructive",
        });
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoFile(null);
    setSelectedAvatarId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectAvatar = (avatarId: number) => {
    setSelectedAvatarId(avatarId);
    setPhoto(null);
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCurrentAvatar = () => {
    if (photo) {
      return { type: 'photo' as const, src: photo };
    }
    if (selectedAvatarId) {
      const avatar = TEMPLATE_AVATARS.find(a => a.id === selectedAvatarId);
      return { type: 'template' as const, avatar };
    }
    return { type: 'initials' as const };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите имя сотрудника",
        variant: "destructive",
      });
      return;
    }
    
    if (!position.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите должность",
        variant: "destructive",
      });
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    updateEmployeeMutation.mutate({
      full_name: fullName,
      position: position.trim(),
      photo: photoFile || undefined,
      avatarId: selectedAvatarId,
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
            Редактировать профиль сотрудника
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {(() => {
                const currentAvatar = getCurrentAvatar();
                if (currentAvatar.type === 'photo') {
                  return (
                    <div className="relative">
                      <img
                        src={currentAvatar.src}
                        alt="Фото сотрудника"
                        className="size-[80px] rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-1 -right-1 size-6 rounded-full bg-[#ff0006] flex items-center justify-center text-white hover:bg-[#e00000] transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                }
                if (currentAvatar.type === 'template') {
                  return (
                    <div className="relative">
                      <img
                        src={currentAvatar.avatar?.image}
                        alt={`Аватарка ${currentAvatar.avatar?.id}`}
                        className="size-[80px] rounded-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div
                        className="avatar-fallback size-[80px] rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-medium text-2xl hidden"
                      >
                        {employee && employee.full_name
                          .split(' ')
                          .map(n => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-1 -right-1 size-6 rounded-full bg-[#ff0006] flex items-center justify-center text-white hover:bg-[#e00000] transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="size-[80px] rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-medium text-2xl relative group">
                    {employee && (
                      <>
                        {employee.full_name
                          .split(' ')
                          .map(n => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="flex flex-col items-center gap-3 w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="px-4 py-2 rounded-[20px] bg-[#f8f8f8] text-sm font-medium text-[#1a1a1a] hover:bg-[#eeeeee] transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {photo ? "Изменить фото" : "Загрузить фото"}
              </label>

              {/* Template Avatars */}
              <div className="w-full">
                <p className="text-xs text-[#959595] text-center mb-3 leading-[1.2]">
                  Или выберите шаблонную аватарку
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {TEMPLATE_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => handleSelectAvatar(avatar.id)}
                      className={`size-14 rounded-full overflow-hidden transition-all relative ${
                        selectedAvatarId === avatar.id
                          ? 'ring-2 ring-[#e16546] ring-offset-2 ring-offset-white scale-105'
                          : 'hover:scale-105 hover:ring-2 hover:ring-[#eeeeee]'
                      }`}
                    >
                      <img
                        src={avatar.image}
                        alt={`Аватарка ${avatar.id}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Show placeholder if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.classList.add('bg-[#f8f8f8]');
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-[#959595]">?</div>';
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <label htmlFor="edit-firstName" className="text-sm font-medium text-[#1a1a1a] leading-[1.2] block">
              Имя *
            </label>
            <input
              id="edit-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Иван"
              required
              className="w-full px-4 py-3 rounded-[12px] border border-[#eeeeee] bg-white text-[#1a1a1a] text-sm leading-[1.2] focus:outline-none focus:border-[#e16546] transition-colors"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <label htmlFor="edit-lastName" className="text-sm font-medium text-[#1a1a1a] leading-[1.2] block">
              Фамилия
            </label>
            <input
              id="edit-lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Иванов"
              className="w-full px-4 py-3 rounded-[12px] border border-[#eeeeee] bg-white text-[#1a1a1a] text-sm leading-[1.2] focus:outline-none focus:border-[#e16546] transition-colors"
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label htmlFor="edit-position" className="text-sm font-medium text-[#1a1a1a] leading-[1.2] block">
              Должность *
            </label>
            <input
              id="edit-position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Менеджер"
              required
              className="w-full px-4 py-3 rounded-[12px] border border-[#eeeeee] bg-white text-[#1a1a1a] text-sm leading-[1.2] focus:outline-none focus:border-[#e16546] transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={updateEmployeeMutation.isPending}
              className="flex-1 bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm font-medium text-[#1a1a1a] hover:bg-[#eeeeee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={updateEmployeeMutation.isPending}
              className="flex-1 bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {updateEmployeeMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Сохранить
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

