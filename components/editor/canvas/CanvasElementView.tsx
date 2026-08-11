"use client";

import { useEffect, useRef } from "react";
import { FileText, FileImage, FileAudio, FileVideo, FileCode, File as FileIcon } from "lucide-react";
import type { CanvasElement } from "@/lib/canvas/types";
import { smoothPathD } from "@/lib/canvas/geometry";

interface EditingCell {
  elementId: string;
  row: number;
  col: number;
}

interface CanvasElementViewProps {
  element: CanvasElement;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onCommitEdit: () => void;
  editingCell: EditingCell | null;
  cellEditValue: string;
  onCellEditChange: (value: string) => void;
  onCommitCellEdit: () => void;
}

function diamondPoints(x: number, y: number, w: number, h: number): string {
  return `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
}

function fileLinkIcon(extension: string) {
  const ext = extension.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) return FileImage;
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext)) return FileAudio;
  if (["mp4", "webm", "mov", "ogv"].includes(ext)) return FileVideo;
  if (["html", "htm", "json", "js", "ts", "tsx", "jsx", "css", "py", "md"].includes(ext)) return FileCode;
  if (["pdf", "txt", "doc", "docx"].includes(ext)) return FileText;
  return FileIcon;
}

export function CanvasElementView({
  element: el,
  isEditing,
  editValue,
  onEditChange,
  onCommitEdit,
  editingCell,
  cellEditValue,
  onCellEditChange,
  onCommitCellEdit,
}: CanvasElementViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // autoFocus is unreliable for elements newly mounted inside an SVG
  // <foreignObject> (a real, observed timing quirk — the browser can
  // leave focus on whatever previously had it, e.g. the SVG itself,
  // instead of moving it to the new textarea). Focusing explicitly once
  // the node exists is the reliable way to do this here.
  useEffect(() => {
    if (isEditing) {
      const id = window.setTimeout(() => {
        const node = textareaRef.current;
        if (node) {
          node.focus();
          node.select();
        }
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    function handleOutsideMouseDown(e: MouseEvent) {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        onCommitEdit();
      }
    }
    // Attaching this on the same tick as the element's creation is unsafe:
    // the native "mousedown" that immediately follows the creating
    // "pointerdown" (same physical click) can still be in flight, and by
    // then React has already re-rendered with the new selection outline
    // in place — that mousedown re-hit-tests against the updated DOM and
    // would otherwise trigger an instant, spurious commit.
    const armId = window.setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideMouseDown, true);
    }, 0);
    return () => {
      window.clearTimeout(armId);
      document.removeEventListener("mousedown", handleOutsideMouseDown, true);
    };
  }, [isEditing, onCommitEdit]);

  useEffect(() => {
    if (editingCell?.elementId === el.id) {
      const id = window.setTimeout(() => {
        cellInputRef.current?.focus();
        cellInputRef.current?.select();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [editingCell, el.id]);

  const common = { opacity: el.opacity };

  switch (el.type) {
    case "rectangle":
      return (
        <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={4} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} {...common} />
      );

    case "ellipse":
      return (
        <ellipse
          cx={el.x + el.width / 2}
          cy={el.y + el.height / 2}
          rx={el.width / 2}
          ry={el.height / 2}
          fill={el.fillColor}
          stroke={el.strokeColor}
          strokeWidth={el.strokeWidth}
          {...common}
        />
      );

    case "diamond":
      return (
        <polygon points={diamondPoints(el.x, el.y, el.width, el.height)} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} {...common} />
      );

    case "line":
    case "arrow":
      return (
        <path
          d={smoothPathD(el.points)}
          fill="none"
          stroke={el.strokeColor}
          strokeWidth={el.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={el.type === "arrow" && el.endArrow ? `url(#arrowhead-${el.id})` : undefined}
          {...common}
        />
      );

    case "freehand":
      return (
        <path
          d={smoothPathD(el.points)}
          fill="none"
          stroke={el.strokeColor}
          strokeWidth={el.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...common}
        />
      );

    case "highlighter":
      // Flat cap (not round) plus a multiply blend is what actually reads
      // as "highlighter" rather than just a wide translucent pen — round
      // caps and a plain alpha blend both look more like a thick marker.
      return (
        <path
          d={smoothPathD(el.points)}
          fill="none"
          stroke={el.strokeColor}
          strokeWidth={el.strokeWidth}
          strokeLinecap="butt"
          strokeLinejoin="round"
          style={{ mixBlendMode: "multiply" }}
          {...common}
        />
      );

    case "image":
      return (
        <image
          href={el.src}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          preserveAspectRatio="none"
          {...common}
        />
      );

    case "table": {
      const colWidth = el.width / el.cols;
      const rowHeight = el.height / el.rows;
      return (
        <g opacity={el.opacity}>
          <rect x={el.x} y={el.y} width={el.width} height={el.height} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} />
          {Array.from({ length: el.cols - 1 }, (_, i) => (
            <line
              key={`col-${i}`}
              x1={el.x + colWidth * (i + 1)}
              y1={el.y}
              x2={el.x + colWidth * (i + 1)}
              y2={el.y + el.height}
              stroke={el.strokeColor}
              strokeWidth={Math.max(1, el.strokeWidth / 2)}
            />
          ))}
          {Array.from({ length: el.rows - 1 }, (_, i) => (
            <line
              key={`row-${i}`}
              x1={el.x}
              y1={el.y + rowHeight * (i + 1)}
              x2={el.x + el.width}
              y2={el.y + rowHeight * (i + 1)}
              stroke={el.strokeColor}
              strokeWidth={Math.max(1, el.strokeWidth / 2)}
            />
          ))}
          {el.cells.map((rowCells, r) =>
            rowCells.map((cellText, c) => {
              const isEditingThisCell =
                editingCell && editingCell.elementId === el.id && editingCell.row === r && editingCell.col === c;
              return (
                <foreignObject key={`${r}-${c}`} x={el.x + colWidth * c} y={el.y + rowHeight * r} width={colWidth} height={rowHeight}>
                  <div
                    // @ts-expect-error -- xmlns is valid on a raw div inside foreignObject
                    xmlns="http://www.w3.org/1999/xhtml"
                    className="w-full h-full flex items-center px-1.5 overflow-hidden"
                  >
                    {isEditingThisCell ? (
                      <input
                        ref={cellInputRef}
                        value={cellEditValue}
                        onChange={(e) => onCellEditChange(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape" || e.key === "Tab") onCommitCellEdit();
                          e.stopPropagation();
                        }}
                        style={{ fontSize: el.fontSize, color: el.textColor }}
                        className="w-full h-full bg-transparent outline-none font-sans"
                      />
                    ) : (
                      <span style={{ fontSize: el.fontSize, color: el.textColor }} className="w-full truncate font-sans">
                        {cellText}
                      </span>
                    )}
                  </div>
                </foreignObject>
              );
            })
          )}
        </g>
      );
    }

    case "file-link": {
      const Icon = fileLinkIcon(el.extension);
      return (
        <foreignObject x={el.x} y={el.y} width={el.width} height={el.height} style={{ opacity: el.opacity, pointerEvents: "none" }}>
          <div
            // @ts-expect-error -- xmlns is valid on a raw div inside foreignObject
            xmlns="http://www.w3.org/1999/xhtml"
            className="w-full h-full flex items-center gap-2 px-2.5 rounded-md border bg-white dark:bg-surfaceDark"
            style={{ borderColor: el.strokeColor }}
          >
            <Icon size={16} className="shrink-0 text-graphite dark:text-graphiteDark" />
            <span className="truncate text-xs font-sans text-ink dark:text-inkDark">{el.fileName}</span>
          </div>
        </foreignObject>
      );
    }

    case "text":
    case "sticky": {
      const isSticky = el.type === "sticky";
      return (
        <foreignObject x={el.x} y={el.y} width={el.width} height={el.height} style={{ opacity: el.opacity }}>
          <div
            // xmlns required for foreignObject content to render across browsers
            // @ts-expect-error -- xmlns is valid on a raw div inside foreignObject
            xmlns="http://www.w3.org/1999/xhtml"
            className={`w-full h-full ${isSticky ? "rounded-md shadow-sm p-2" : ""}`}
            style={{ background: isSticky ? el.fillColor : "transparent" }}
          >
            {isEditing ? (
              <textarea
                ref={textareaRef}
                autoFocus
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onCommitEdit();
                  e.stopPropagation();
                }}
                style={{
                  fontSize: el.fontSize,
                  color: el.strokeColor,
                  textAlign: el.type === "text" ? el.textAlign : "left",
                }}
                className="w-full h-full resize-none bg-transparent outline-none font-sans leading-snug"
              />
            ) : (
              <div
                style={{
                  fontSize: el.fontSize,
                  color: el.strokeColor,
                  textAlign: el.type === "text" ? el.textAlign : "left",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
                className="w-full h-full font-sans leading-snug overflow-hidden"
              >
                {el.text || ""}
              </div>
            )}
          </div>
        </foreignObject>
      );
    }

    default:
      return null;
  }
}
