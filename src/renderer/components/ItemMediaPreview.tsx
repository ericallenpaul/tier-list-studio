import { useEffect, useState } from "react";

import type { ManagedAssetPreview } from "../../shared/models/api";
import type { EditorBoardItem } from "../domain/editorTypes";

type ItemMediaPreviewProps = {
  item: EditorBoardItem;
};

const previewCache = new Map<string, Promise<ManagedAssetPreview> | ManagedAssetPreview>();

const getPreview = (assetId: string) => {
  const cached = previewCache.get(assetId);
  if (cached) {
    return cached;
  }

  const request = window.tierStudio.assets.getMediaDataUrl(assetId)
    .then((preview) => {
      previewCache.set(assetId, preview);
      return preview;
    })
    .catch((caught) => {
      const preview: ManagedAssetPreview = {
        status: "unavailable",
        assetId,
        kind: "file",
        reason: caught instanceof Error ? caught.message : "Managed asset preview is not available."
      };
      previewCache.set(assetId, preview);
      return preview;
    });
  previewCache.set(assetId, request);
  return request;
};

const isPreviewResult = (value: Promise<ManagedAssetPreview> | ManagedAssetPreview): value is ManagedAssetPreview =>
  "status" in value;

export const ItemMediaPreview = ({ item }: ItemMediaPreviewProps) => {
  const [preview, setPreview] = useState<ManagedAssetPreview | null>(() => {
    if (!item.assetId || (item.kind !== "image" && item.kind !== "video")) {
      return null;
    }
    const cached = previewCache.get(item.assetId);
    return cached && isPreviewResult(cached) ? cached : null;
  });

  useEffect(() => {
    if (!item.assetId || (item.kind !== "image" && item.kind !== "video")) {
      setPreview(null);
      return;
    }

    let canceled = false;
    const cached = getPreview(item.assetId);
    if (isPreviewResult(cached)) {
      setPreview(cached);
      return;
    }

    setPreview(null);
    void cached.then((loadedPreview) => {
      if (!canceled) {
        setPreview(loadedPreview);
      }
    });

    return () => {
      canceled = true;
    };
  }, [item.assetId, item.kind]);

  if (!item.assetId || (item.kind !== "image" && item.kind !== "video")) {
    return <span className="item-chip-label">{item.label}</span>;
  }

  if (!preview) {
    return (
      <span className="media-preview" data-media-status="loading">
        <span className="item-chip-label">{item.label}</span>
      </span>
    );
  }

  if (preview.status !== "available") {
    return (
      <span className="media-preview media-preview-fallback" data-media-status="fallback" title={preview.reason}>
        <span className="media-kind">{item.kind}</span>
        <span className="item-chip-label">{item.label}</span>
      </span>
    );
  }

  return (
    <span className="media-preview" data-media-status="loaded">
      {preview.kind === "image" ? (
        <img className="media-preview-image" src={preview.dataUrl} alt="" aria-hidden="true" draggable={false} />
      ) : (
        <video className="media-preview-video" src={preview.dataUrl} muted playsInline preload="metadata" aria-hidden="true" />
      )}
      <span className="item-chip-label media-label">{item.label}</span>
    </span>
  );
};
