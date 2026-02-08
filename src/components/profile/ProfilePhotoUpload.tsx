import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  onPhotoChange: (url: string | null, hasPhoto: boolean) => void;
  nickname?: string;
}

export function ProfilePhotoUpload({ currentPhotoUrl, onPhotoChange, nickname }: ProfilePhotoUploadProps) {
  const { currentUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${currentUser.id}/avatar.${fileExt}`;

      // Delete existing avatar if any
      await supabase.storage.from('avatars').remove([filePath]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache buster
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
      
      // Persist avatar URL to profile
      await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBuster } as Record<string, unknown>)
        .eq('user_id', currentUser.id);

      setPreviewUrl(urlWithCacheBuster);
      onPhotoChange(urlWithCacheBuster, true);
      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentUser) return;

    setIsUploading(true);
    try {
      // List and delete all files in user's folder
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(currentUser.id);

      if (files && files.length > 0) {
        const filesToRemove = files.map(f => `${currentUser.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToRemove);
      }

      // Clear avatar URL from profile
      await supabase
        .from('profiles')
        .update({ avatar_url: null } as Record<string, unknown>)
        .eq('user_id', currentUser.id);

      setPreviewUrl(null);
      onPhotoChange(null, false);
      toast.success('Photo removed');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    if (nickname) {
      return nickname.slice(0, 2).toUpperCase();
    }
    return '👤';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="w-24 h-24 border-4 border-primary/20">
          <AvatarImage src={previewUrl || undefined} alt="Profile photo" />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          {previewUrl ? (
            <>
              <Camera className="w-4 h-4" />
              Change
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Add Photo
            </>
          )}
        </Button>
        
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemovePhoto}
            disabled={isUploading}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
