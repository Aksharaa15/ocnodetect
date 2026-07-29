/**
 * Icon — modern high-fidelity vector icon component using lucide-react-native.
 * This aligns mobile icons 1:1 with the beautiful vector style used in the surgical-compass web app.
 */
import React from 'react';
import { ViewStyle } from 'react-native';
import {
  // Navigation & Bottom Tab
  LayoutDashboard,
  ScanLine,
  MessageCircle,
  BookOpen,
  UserCircle,
  Layout,
  User,
  
  // Dashboard & Stats
  Stethoscope,
  FileText,
  Timer,
  Activity,
  Sparkles,
  Zap,
  Clock,
  
  // Scan & Processing
  FileScan,
  File,
  CheckCircle2,
  CheckCircle,
  Loader2,
  Loader,
  Save,
  
  // General & Utility
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  ArrowUp,
  ArrowRight,
  ExternalLink,
  Trash2,
  Folder,
  Bookmark,
  Calendar,
  Bell,
  Home,
  Info,
  Sun,
  Moon,
  Star,
  Search,
  HelpCircle,
  Check,
  Mail,
  Lock,
  Plus,
  LogOut,
  LogIn,
  ArrowLeft,
  Send,

  // OcnoDetect / Medical
  HeartPulse,
  Brain,
  ShieldCheck,
  Cpu,
  Shield,

  // General Media
  Image as ImageIcon,
  Images as ImagesIcon,
} from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  // Navigation / Bottom Tab
  'layout-dashboard': LayoutDashboard,
  'layout': Layout,
  'scan-line': ScanLine,
  'maximize': ScanLine, // fallback for legacy bottom-tab key name
  'message-circle': MessageCircle,
  'book-open': BookOpen,
  'user-circle': UserCircle,
  'user': User,

  // Stats / Dashboard
  'stethoscope': Stethoscope,
  'file-text': FileText,
  'timer': Timer,
  'clock': Clock,
  'activity': Activity,
  'sparkles': Sparkles,
  'zap': Zap,

  // Scan & Files
  'file-scan': FileScan,
  'file': FileScan, // default to file scan for medical context
  'file-raw': File,
  'check-circle-2': CheckCircle2,
  'check-circle': CheckCircle,
  'loader-2': Loader2,
  'loader': Loader,
  'save': Save,
  'image': ImageIcon,
  'images': ImagesIcon,

  // System & Directional
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'x': X,
  'arrow-up': ArrowUp,
  'arrow-right': ArrowRight,
  'external-link': ExternalLink,
  'trash-2': Trash2,
  'folder': Folder,
  'bookmark': Bookmark,
  'calendar': Calendar,
  'bell': Bell,
  'home': Home,
  'info': Info,
  'sun': Sun,
  'moon': Moon,
  'star': Star,
  'search': Search,
  'check': Check,
  'mail': Mail,
  'lock': Lock,
  'plus': Plus,
  'log-out': LogOut,
  'log-in': LogIn,
  'arrow-left': ArrowLeft,
  'send': Send,

  // OcnoDetect / Medical
  'heart-pulse': HeartPulse,
  'brain': Brain,
  'shield-check': ShieldCheck,
  'cpu': Cpu,
  'shield': Shield,
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: ViewStyle;
}

export default function Icon({
  name,
  size = 16,
  color = '#000',
  strokeWidth = 2,
  style,
}: IconProps) {
  const LucideIcon = ICON_MAP[name] || HelpCircle;

  return (
    <LucideIcon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
}
