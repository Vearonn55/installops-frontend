// src/dev/DevControls.tsx
import { useEffect, useRef, useState } from 'react';
import type { UserRole } from '../types';
import { setMockRole, clearMock, } from './mockAuth';
import { GripVertical, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type DevtoolsCorner = Corner;

const RQ_POS_KEY = 'DEV_RQ_POS';
const ROLE_POS_KEY = 'DEV_ROLE_POS';
const COLLAPSE_KEY = 'DEV_ROLE_COLLAPSED';

const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const ROLES: UserRole[] = ['ADMIN', 'STORE_MANAGER', 'CREW'];

function loadCorner(key: string, fallback: Corner): Corner {
  const v = localStorage.getItem(key) as Corner | null;
  return CORNERS.includes(v as Corner) ? (v as Corner) : fallback;
}
function saveCorner(key: string, v: Corner) {
  localStorage.setItem(key, v);
}
function loadCollapsed(): boolean {
  return localStorage.getItem(COLLAPSE_KEY) === '1';
}
function saveCollapsed(v: boolean) {
  localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
}
function cornerClass(corner: Corner) {
  switch (corner) {
    case 'top-left': return 'top-4 left-4';
    case 'top-right': return 'top-4 right-4';
    case 'bottom-left': return 'bottom-4 left-4';
    case 'bottom-right':
    default: return 'bottom-4 right-4';
  }
}

// notify App.tsx so the RQ orb moves instantly
function notifyRqPos(corner: DevtoolsCorner) {
  localStorage.setItem(RQ_POS_KEY, corner);
  window.dispatchEvent(new CustomEvent('rqpos', { detail: corner }));
}

export default function DevControls() {
  const [roleCorner, setRoleCorner] = useState<Corner>(() => loadCorner(ROLE_POS_KEY, 'bottom-right'));
  const [rqCorner, setRqCorner] = useState<DevtoolsCorner>(() => loadCorner(RQ_POS_KEY, 'bottom-right'));
  const [collapsed, setCollapsed] = useState<boolean>(() => loadCollapsed());

  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => saveCorner(ROLE_POS_KEY, roleCorner), [roleCorner]);
  useEffect(() => localStorage.setItem(RQ_POS_KEY, rqCorner), [rqCorner]);
  useEffect(() => saveCollapsed(collapsed), [collapsed]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging || collapsed) return;
      setDragPos({ x: e.clientX, y: e.clientY });
    }
    function onUp() {
      if (!dragging || !panelRef.current || collapsed) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = dragPos?.x ?? vw / 2;
      const y = dragPos?.y ?? vh / 2;
      const horiz = x < vw / 2 ? 'left' : 'right';
      const vert = y < vh / 2 ? 'top' : 'bottom';
      setRoleCorner(`${vert}-${horiz}` as Corner);
      setDragging(false);
      setDragPos(null);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, dragPos, collapsed]);

  const styleWhenDragging =
    dragging && dragPos && !collapsed
      ? { position: 'fixed' as const, left: dragPos.x - 160, top: dragPos.y - 20, zIndex: 9999 }
      : undefined;

  if (collapsed) {
    return (
      <button
        type="button"
        className={cn(
          'fixed z-50 rounded-full border border-gray-200 bg-white/95 shadow flex items-center gap-2 px-3 py-2 text-xs',
          cornerClass(roleCorner)
        )}
        onClick={() => setCollapsed(false)}
        title="Open Dev Controls"
      >
        <Wrench className="h-4 w-4 text-gray-600" />
        <span className="text-gray-700">Dev Controls</span>
        <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-50 rounded-xl border border-gray-200 bg-white/95 shadow w-[320px]',
        !dragging && cornerClass(roleCorner)
      )}
      style={styleWhenDragging}
    >
      {/* Header (drag handle) */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-xl cursor-move select-none"
        onMouseDown={() => setDragging(true)}
        title="Drag to move; snaps to nearest corner"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <GripVertical className="h-4 w-4 text-gray-400" />
          Dev Controls
        </div>

        {/* FIX: stop drag when clicking collapse */}
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
          onMouseDown={(e) => e.stopPropagation()}   // ⬅️ important
          onClick={() => setCollapsed(true)}
          title="Collapse"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Positions */}
      <div className="px-3 py-2 grid grid-cols-2 gap-2">
        <div className="text-[11px] text-gray-600">
          <div className="mb-1 font-medium">Role switcher position</div>
          <select
            value={roleCorner}
            onChange={(e) => setRoleCorner(e.target.value as Corner)}
            className="w-full rounded border px-2 py-1 text-xs"
          >
            {CORNERS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-gray-600">
          <div className="mb-1 font-medium">React Query btn position</div>
          <select
            value={rqCorner}
            onChange={(e) => {
              const next = e.target.value as DevtoolsCorner;
              setRqCorner(next);
              notifyRqPos(next);
            }}
            className="w-full rounded border px-2 py-1 text-xs"
          >
            {CORNERS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="mt-1 text-[10px] text-gray-400">
            Persists to Devtools button via App.tsx
          </div>
        </div>
      </div>

      {/* Roles */}
      <div className="px-3 pb-3">
        <div className="mb-1 text-[11px] font-medium text-gray-600">Quick roles</div>
        <div className="flex flex-wrap gap-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setMockRole(r)}
              className="text-[11px] px-2 py-1 border rounded hover:bg-gray-50"
              type="button"
            >
              {r}
            </button>
          ))}
          <button
            onClick={clearMock}
            className="text-[11px] px-2 py-1 border rounded text-red-600 hover:bg-red-50"
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="px-3 pb-2 text-[10px] text-gray-400">Dev only</div>
    </div>
  );
}
