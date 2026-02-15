'use client';

import { useState, useRef, useTransition } from 'react';
import { UploadCloud, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getVerificationResult } from '@/app/actions';
import type { ContentVerificationExplanationOutput } from '@/ai/flows/content-verification-explanation';
import { useToast } from '@/hooks/use-toast';

function FileUploadZone({ onFileSelect, isPending }: { onFileSelect: (file: File) => void, isPending: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDropzoneClick = () => {
    if (!isPending) {
        inputRef.current?.click();
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isPending) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
        onFileSelect(file);
    }
  };

  return (
    <div
      onClick={handleDropzoneClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="mt-8 border-2 border-dashed border-border rounded-3xl p-12 bg-card hover:border-primary/50 transition-all group cursor-pointer"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />
      <div className="flex flex-col items-center gap-4 text-muted-foreground group-hover:text-primary transition-colors">
        {isPending ? (
            <>
                <Loader2 className="text-5xl animate-spin" />
                <span className="text-sm font-semibold uppercase tracking-widest">ANALYZING...</span>
            </>
        ) : (
            <>
                <UploadCloud className="text-5xl" />
                <span className="text-sm font-semibold uppercase tracking-widest">Upload Media For Audit</span>
            </>
        )}
      </div>
    </div>
  );
}

const AuditResult = ({ result }: { result: ContentVerificationExplanationOutput }) => {
    if (result.isVerified) {
        return (
            <Card className="bg-card p-8 rounded-3xl border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                         <ShieldCheck className="text-3xl"/>
                    </div>
                </div>
                <h3 className="text-xl font-bold mb-1 text-emerald-600">Audit Result: Authenticated</h3>
                <p className="text-sm text-muted-foreground mb-6">{result.explanation}</p>
                <div className="space-y-4">
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground text-sm">Source Agency</span>
                        <span className="font-bold text-sm">{result.sourceAgency}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground text-sm">Capture Location</span>
                        <span className="font-bold text-sm underline cursor-pointer">{result.captureLocation}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground text-sm">Device Signature</span>
                        <span className="font-mono text-[10px] text-foreground uppercase">{result.deviceSignature}</span>
                    </div>
                </div>
                <div className="mt-8">
                    <Button className="w-full bg-foreground text-background rounded-xl font-bold text-sm hover:bg-foreground/80">View Full Lineage Tree</Button>
                </div>
            </Card>
        );
    }
    
    return (
        <Card className="bg-red-50/50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-200 dark:border-red-900/30 relative overflow-hidden">
            <h3 className="text-xl font-bold text-red-800 dark:text-red-300 mb-4">Audit Result: Unverified</h3>
            <p className="text-red-700 dark:text-red-400 text-sm mb-6 leading-relaxed">{result.explanation}</p>
            <div className="flex items-center gap-4 text-red-800 dark:text-red-300">
                <AlertTriangle className="text-2xl" />
                <span className="font-bold text-sm">PROCEED WITH CAUTION</span>
            </div>
        </Card>
    );
}

export function VerifierView() {
  const [auditResult, setAuditResult] = useState<ContentVerificationExplanationOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUri = reader.result as string;
      startTransition(async () => {
        setAuditResult(null);
        const result = await getVerificationResult(dataUri);
        if (result) {
            setAuditResult(result);
        } else {
            toast({
              variant: "destructive",
              title: "Audit Failed",
              description: "Could not get verification result from the server.",
            });
        }
      });
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "There was a problem reading your file.",
      });
    };
  };

  return (
    <section className="space-y-12 py-12">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h2 className="text-4xl font-extrabold text-foreground tracking-tight">Neutralize Deepfakes</h2>
        <p className="text-lg text-muted-foreground italic">
          Drag and drop any media file to check its cryptographic "Seal of Authenticity" on the Sui Network.
        </p>
        <FileUploadZone onFileSelect={handleFileSelect} isPending={isPending} />
      </div>

      {auditResult && (
        <div className="max-w-4xl mx-auto mt-12 animate-in fade-in-50 duration-500">
            <AuditResult result={auditResult} />
        </div>
      )}
    </section>
  );
}
