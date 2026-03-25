import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Circle, Eraser, Minus, Pen, Square, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Tool = "pen" | "eraser" | "rect" | "circle" | "line";

interface WhiteboardProps {
  onClose: () => void;
}

const PRESET_COLORS = [
  "#ffffff",
  "#ff4444",
  "#ff9900",
  "#ffdd00",
  "#44dd44",
  "#4488ff",
  "#aa44ff",
  "#ff44aa",
  "#000000",
];

interface Point {
  x: number;
  y: number;
}

export function Whiteboard({ onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ffffff");
  const [strokeSize, setStrokeSize] = useState([4]);
  const isDrawingRef = useRef(false);
  const startPoint = useRef<Point | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const strokeSizeRef = useRef(strokeSize);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    strokeSizeRef.current = strokeSize;
  }, [strokeSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }, []);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ): Point => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    isDrawingRef.current = true;
    const pos = getPos(e, canvas);
    startPoint.current = pos;
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (toolRef.current === "pen" || toolRef.current === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const pos = getPos(e, canvas);
    const sz = strokeSizeRef.current[0];
    ctx.lineWidth = sz;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (toolRef.current === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = colorRef.current;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (toolRef.current === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = sz * 3;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (snapshotRef.current && startPoint.current) {
      ctx.globalCompositeOperation = "source-over";
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.strokeStyle = colorRef.current;
      ctx.beginPath();
      if (toolRef.current === "rect") {
        ctx.strokeRect(
          startPoint.current.x,
          startPoint.current.y,
          pos.x - startPoint.current.x,
          pos.y - startPoint.current.y,
        );
      } else if (toolRef.current === "circle") {
        const rx = Math.abs(pos.x - startPoint.current.x) / 2;
        const ry = Math.abs(pos.y - startPoint.current.y) / 2;
        const cx = startPoint.current.x + (pos.x - startPoint.current.x) / 2;
        const cy = startPoint.current.y + (pos.y - startPoint.current.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (toolRef.current === "line") {
        ctx.moveTo(startPoint.current.x, startPoint.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }
  };

  const stopDraw = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.globalCompositeOperation = "source-over";
    isDrawingRef.current = false;
    startPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "pen", icon: <Pen className="w-4 h-4" />, label: "Pen" },
    { id: "eraser", icon: <Eraser className="w-4 h-4" />, label: "Eraser" },
    { id: "rect", icon: <Square className="w-4 h-4" />, label: "Rect" },
    { id: "circle", icon: <Circle className="w-4 h-4" />, label: "Circle" },
    { id: "line", icon: <Minus className="w-4 h-4" />, label: "Line" },
  ];

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{ background: "rgba(10,15,25,0.88)" }}
      data-ocid="whiteboard.panel"
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2 flex-wrap"
        style={{
          background: "rgba(20,25,40,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Tools */}
        <div className="flex items-center gap-1">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              title={t.label}
              data-ocid="whiteboard.toggle"
              className={`p-2 rounded-lg transition-colors ${
                tool === t.id
                  ? "bg-[--meet-teal] text-[--card]"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/15 mx-1" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              data-ocid="whiteboard.toggle"
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                color === c ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            title="Custom color"
            data-ocid="whiteboard.input"
          />
        </div>

        <div className="w-px h-6 bg-white/15 mx-1" />

        {/* Stroke size */}
        <div className="flex items-center gap-2 w-28">
          <span className="text-xs text-white/60">Size</span>
          <Slider
            value={strokeSize}
            onValueChange={setStrokeSize}
            min={1}
            max={30}
            step={1}
            className="flex-1"
            data-ocid="whiteboard.input"
          />
          <span className="text-xs text-white/60 w-4">{strokeSize[0]}</span>
        </div>

        <div className="w-px h-6 bg-white/15 mx-1" />

        {/* Preview */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <span className="text-xs text-white/70 capitalize">{tool}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            className="text-white/70 hover:text-red-400 h-8"
            data-ocid="whiteboard.delete_button"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/70 hover:text-white h-8"
            data-ocid="whiteboard.close_button"
          >
            <X className="w-4 h-4 mr-1" />
            Close
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          data-ocid="whiteboard.canvas_target"
        />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-white/20 text-sm">
            Draw freely — only visible to you
          </span>
        </div>
      </div>
    </div>
  );
}
