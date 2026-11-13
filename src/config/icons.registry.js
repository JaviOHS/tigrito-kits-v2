import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  Moon,
  PackageOpen,
  RefreshCw,
  Search,
  Shirt,
  Sparkles,
  Sun,
  Truck,
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
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  Moon,
  PackageOpen,
  RefreshCw,
  Search,
  Shirt,
  Sparkles,
  Sun,
  Truck,
  Wallet,
  X,
  ZoomIn,
  ZoomOut,
})

export const DEFAULT_ICON_NAME = 'Bell'

export function resolveIcon(name) {
  return ICON_REGISTRY[name] ?? ICON_REGISTRY[DEFAULT_ICON_NAME]
}
