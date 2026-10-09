import {
  Award, BookOpen, Briefcase, Calendar, Compass, DoorOpen, Eye, Flag, Globe, GraduationCap, HandHeart, Handshake,
  HeartHandshake, Laptop, Lightbulb, MapPin, Megaphone, Network, Rocket, School, ShieldCheck, Sparkles, Sprout, Star,
  Target, Trophy, UserPlus, Users,
  type LucideIcon,
} from "lucide-react";

/** Icons editors can choose in the CMS (see ICON_OPTIONS in src/lib/cms/fields.ts). */
const ICONS: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap, laptop: Laptop, users: Users, briefcase: Briefcase, lightbulb: Lightbulb,
  "heart-handshake": HeartHandshake, "hand-heart": HandHeart, handshake: Handshake, target: Target, eye: Eye,
  sparkles: Sparkles, flag: Flag, "shield-check": ShieldCheck, "door-open": DoorOpen, school: School, award: Award,
  compass: Compass, network: Network, "user-plus": UserPlus, "book-open": BookOpen, globe: Globe, megaphone: Megaphone,
  rocket: Rocket, calendar: Calendar, "map-pin": MapPin, star: Star, trophy: Trophy, sprout: Sprout,
};

export function CmsIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = name ? ICONS[name] : undefined;
  return Icon ? <Icon className={className} aria-hidden /> : null;
}
