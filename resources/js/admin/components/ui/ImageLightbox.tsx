import { Modal } from './Modal';

type ImageLightboxProps = {
  open: boolean;
  src?: string;
  title?: string;
  onClose: () => void;
};

export function ImageLightbox({ open, src, title, onClose }: ImageLightboxProps) {
  if (!open || !src) {
    return null;
  }

  return (
    <Modal
      open={open}
      title={title || 'معاينة الصورة'}
      onClose={onClose}
      size="lg"
    >
      <div className="image-lightbox">
        <img src={src} alt={title || ''} className="image-lightbox__img" />
        <a href={src} target="_blank" rel="noreferrer" className="image-lightbox__link">
          فتح الصورة في تبويب جديد
        </a>
      </div>
    </Modal>
  );
}
