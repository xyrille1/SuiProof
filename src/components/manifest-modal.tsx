"use client";
import type { MediaManifest } from "@/lib/data";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { X, Camera, Pen } from "lucide-react";
import { IPFSImage } from "@/components/ipfs-image";

type ManifestModalProps = {
  manifest: MediaManifest;
  onClose: () => void;
};

export function ManifestModal({ manifest, onClose }: ManifestModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 !rounded-3xl shadow-2xl overflow-hidden grid-cols-1 md:grid-cols-2 grid max-h-[90vh]">
        <div className="md:w-full bg-black flex items-center justify-center relative order-1 md:order-1">
          {manifest.modalImageSrc ? (
            <IPFSImage
              src={manifest.modalImageSrc}
              alt="Preview"
              width={800}
              height={800}
              className="object-contain w-full h-full"
              data-ai-hint={manifest.modalImageHint}
              priority
            />
          ) : (
            <div className="aspect-square w-full bg-black" />
          )}
          <div className="absolute bottom-4 left-4">
            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded border border-white/20">
              RAW PIXEL HASH VERIFIED
            </span>
          </div>
        </div>
        <div className="md:w-full p-8 overflow-y-auto order-2 md:order-2">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
                Birth Certificate
              </h2>
              <p className="text-xs font-code text-muted-foreground">
                OID: {manifest.provenanceId}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Object Lineage
              </h4>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs ring-4 ring-primary/20">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="w-0.5 h-8 bg-border"></div>
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
                    <Pen className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  <div className="bg-muted/50 p-3 rounded-xl border">
                    <p className="text-xs font-bold text-foreground">
                      Original Capture
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {manifest.metadata.captureDate}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl border border-dashed opacity-60">
                    <p className="text-xs font-bold text-foreground">
                      Authorized Edit (Pending)
                    </p>
                    <p className="text-[10px] text-muted-foreground italic">
                      No parent-child links detected.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-foreground rounded-2xl p-6 text-background">
              <h4 className="text-[10px] font-bold text-primary/70 uppercase mb-4 tracking-widest">
                Immutable Metadata
              </h4>
              <dl className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-code">
                <div>
                  <dt className="text-muted-foreground/50 mb-1">GPS COORDS</dt>
                  <dd>{manifest.metadata.gps}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground/50 mb-1">AGENCY_ID</dt>
                  <dd className="underline">{manifest.metadata.agencyId}</dd>
                </div>
                {manifest.ipfsCid && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground/50 mb-1">
                      IPFS CID (Pinata)
                    </dt>
                    <dd className="opacity-80 leading-tight break-all">
                      {manifest.ipfsCid}
                    </dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-muted-foreground/50 mb-1">
                    CONTENT_HASH (BLAKE2b)
                  </dt>
                  <dd className="opacity-80 leading-tight break-all">
                    {manifest.metadata.contentHash}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <footer className="mt-8 pt-6 border-t flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl font-bold">
              Download Proof JSON
            </Button>
            <Button className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20">
              Share Public URL
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
