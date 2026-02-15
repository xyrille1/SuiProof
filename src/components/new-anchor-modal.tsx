'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X, Upload } from 'lucide-react';

type NewAnchorModalProps = {
  onClose: () => void;
};

export function NewAnchorModal({ onClose }: NewAnchorModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-8 !rounded-3xl shadow-2xl">
        <DialogTitle className="text-2xl font-bold text-foreground">Create New Anchor</DialogTitle>
        <DialogDescription className="text-muted-foreground">Upload a media file to create a new on-chain anchor.</DialogDescription>

        <div className="space-y-6">
          <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-muted-foreground">MP4, MOV, or other video formats (max. 500MB)</p>
              </div>
              <input id="dropzone-file" type="file" className="hidden" />
            </label>
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20">Create Anchor</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
