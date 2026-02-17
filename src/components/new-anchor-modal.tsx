"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Upload, X, Loader2, Building2, Wallet } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

type NewAnchorModalProps = {
  open: boolean;
  onClose: () => void;
  onCreateAnchor: (
    file: File,
    gps: string,
    agencyId: string,
    useSponsored?: boolean,
  ) => Promise<void>;
};

export function NewAnchorModal({
  open,
  onClose,
  onCreateAnchor,
}: NewAnchorModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gps, setGps] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [useSponsored, setUseSponsored] = useState(true); // Default to sponsored
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

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

  const handleCreateAnchor = async () => {
    if (file) {
      setIsProcessing(true);
      try {
        await onCreateAnchor(file, gps, agencyId, useSponsored);
        onClose();
      } catch (error) {
        console.error("Error creating anchor:", error);
        setIsProcessing(false);
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-8 !rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Create New Anchor
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a media file to create a new on-chain anchor.
          </DialogDescription>
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
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF or other image formats (max. 50MB)
                  </p>
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && handleFileChange(e.target.files[0])
                  }
                  accept="image/*"
                />
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
                <Image
                  src={previewUrl}
                  alt="Selected file preview"
                  layout="fill"
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="text-center mt-2 text-sm text-muted-foreground truncate">
                {file?.name}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {/* Transaction Mode Selector */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                {useSponsored ? (
                  <Building2 className="w-5 h-5 text-primary" />
                ) : (
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="sponsor-mode" className="cursor-pointer">
                    {useSponsored
                      ? "Institutional Sponsorship"
                      : "Direct Wallet"}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {useSponsored
                      ? "Institution pays gas fees (recommended for journalists)"
                      : "You pay gas fees from your wallet"}
                  </p>
                </div>
              </div>
              <Switch
                id="sponsor-mode"
                checked={useSponsored}
                onCheckedChange={setUseSponsored}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gps">GPS Coordinates</Label>
              <Input
                id="gps"
                placeholder="e.g., 40.7128N, 74.0060W"
                value={gps}
                onChange={(e) => setGps(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agencyId">Agency ID</Label>
              <Input
                id="agencyId"
                placeholder="e.g., SUI_AP_091"
                value={agencyId}
                onChange={(e) => setAgencyId(e.target.value)}
              />
            </div>
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl font-bold"
            onClick={onClose}
            disabled={false}
          >
            {isProcessing ? "Close" : "Cancel"}
          </Button>
          <Button
            className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20"
            onClick={handleCreateAnchor}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {processingStep || "Processing..."}
              </>
            ) : (
              "Create Anchor"
            )}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
