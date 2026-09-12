import type { ImgHTMLAttributes } from 'react';
import { imageUrl } from '@assets/manifest';
import type { AssetKey } from '@assets/manifest.generated';

export interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  asset: AssetKey;
  /** Size variant for image sets (128/256/512/1024 or 'thumb'/'full'). */
  size?: number | string;
  pixel?: boolean;
  tint?: string;
}

/** `<img>` bound to a manifest key. `tint` applies a multiply-style colour via CSS filters is not possible, so tinted variants use a mask overlay in the caller. */
export function AssetImage({
  asset,
  size,
  pixel = false,
  className,
  alt = '',
  draggable = false,
  ...rest
}: AssetImageProps) {
  return (
    <img
      src={imageUrl(asset, size)}
      alt={alt}
      draggable={draggable}
      decoding="async"
      className={[pixel ? 'pixel' : '', className ?? ''].join(' ')}
      {...rest}
    />
  );
}
