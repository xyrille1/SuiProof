'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

type NewAnchorModalProps = {
  onClose: () => void;
};

export function NewAnchorModal({ onClose }: NewAnchorModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleCreateAnchor = () => {
    if (file) {
      console.log('Creating anchor for:', file);
      // TODO: Implement actual anchor creation logic (e.g., call a server endpoint)
      onClose();
    }
  };
  
  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-8 !rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Create New Anchor</DialogTitle>
          <DialogDescription className="text-muted-foreground">Upload a media file to create a new on-chain anchor.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
            {!previewUrl ? (
                <div className="flex items-center justify-center w-full">
                    <label 
                        htmlFor="dropzone-file" 
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF or other image formats (max. 50MB)</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} accept="image/*" />
                    </label>
                </div>
            ) : (
                <div className="relative group">
                    <div 
                        className="absolute top-2 right-2 z-10 bg-background/50 backdrop-blur-sm rounded-full p-1.5 cursor-pointer text-foreground/80 hover:text-foreground hover:bg-background/70 transition-all"
                        onClick={handleRemoveFile}
                    >
                        <X className="w-4 h-4" />
                    </div>
                    <div className="w-full aspect-video rounded-lg bg-muted overflow-hidden relative flex-shrink-0">
                        <Image src={previewUrl} alt="Selected file preview" layout="fill" className="object-cover w-full h-full" />
                    </div>
                    <div className="text-center mt-2 text-sm text-muted-foreground truncate">{file?.name}</div>
                </div>
            )}
        </div>

        <footer className="mt-8 pt-6 border-t flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={handleCreateAnchor} disabled={!file}>Create Anchor</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
