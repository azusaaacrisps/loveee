import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AvatarCropperProps {
  imageSrc: string;
  onConfirm: (croppedImage: string) => void;
  onCancel: () => void;
}

export const AvatarCropper: React.FC<AvatarCropperProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageObj(img);
      const canvasSize = 300;
      const scaleX = canvasSize / img.width;
      const scaleY = canvasSize / img.height;
      setScale(Math.max(scaleX, scaleY));
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!canvasRef.current || !imageObj) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
      imageObj,
      canvas.width / 2 + position.x - (imageObj.width * scale) / 2,
      canvas.height / 2 + position.y - (imageObj.height * scale) / 2,
      imageObj.width * scale,
      imageObj.height * scale
    );

    ctx.restore();
  }, [imageObj, scale, position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  }, [isDragging, startPos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      return Math.max(0.1, Math.min(5, prev * delta));
    });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartPos({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - startPos.x,
      y: e.touches[0].clientY - startPos.y,
    });
  }, [isDragging, startPos]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePinch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length !== 2) return;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    const initialDistance = 100;
    setScale((prev) => Math.max(0.1, Math.min(5, prev * (distance / initialDistance))));
  }, []);

  const handleConfirm = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 200;
    outputCanvas.height = 200;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(canvas, 0, 0, 200, 200);
    // 使用 PNG 保留圆形透明区域，避免 JPEG 将透明填充为黑色导致黑边
    const croppedImage = outputCanvas.toDataURL('image/png');
    onConfirm(croppedImage);
  }, [onConfirm]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">裁剪头像</h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="relative mb-4">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="w-full rounded-full border-4 border-white shadow-lg cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => {
              if (e.touches.length === 1) {
                handleTouchMove(e);
              } else {
                handlePinch(e);
              }
            }}
            onTouchEnd={handleTouchEnd}
          />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full rounded-full border-2 border-white/50 border-dashed" />
            <div className="absolute w-8 h-8 border-2 border-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>

        <p className="text-text-muted text-xs text-center mb-4">
          拖动图片调整位置，滚轮缩放大小
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 text-text-secondary rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};
