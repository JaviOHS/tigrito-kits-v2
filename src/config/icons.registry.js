import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  FileJson,
  ImagePlus,
  Info,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  PackageOpen,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Shirt,
  Sparkles,
  Sun,
  Trash2,
  Truck,
  Upload,
  Wallet,
  X,
  ZoomIn,
  ZoomOut,
} from '@lucide/vue'

/**
 * Central icon registry. Add icons here as they are needed; never import the
 * whole Lucide package so Vite can tree-shake unused SVGs away.
 */
export const ICON_REGISTRY = Object.freeze({
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  FileJson,
  ImagePlus,
  Info,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  PackageOpen,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Shirt,
  Sparkles,
  Sun,
  Trash2,
  Truck,
  Upload,
  Wallet,
  X,
  ZoomIn,
  ZoomOut,
})

export const DEFAULT_ICON_NAME = 'Bell'

/**
 * Sorted list of icon names that can be referenced from JSON configs. Keep it
 * derived from the registry so the admin icon picker never drifts from the
 * tree-shaken bundle.
 */
export const AVAILABLE_ICON_NAMES = Object.freeze(
  Object.keys(ICON_REGISTRY).sort((a, b) => a.localeCompare(b)),
)

export function resolveIcon(name) {
  return ICON_REGISTRY[name] ?? ICON_REGISTRY[DEFAULT_ICON_NAME]
}
