import {
  Folder, Link2, Star, Heart, Bookmark, Home, Briefcase, GraduationCap,
  Code2, Palette, Camera, Music, Film, Gamepad2, Book, Newspaper,
  ShoppingBag, ShoppingCart, CreditCard, DollarSign, TrendingUp, LineChart,
  Users, User, MessageCircle, Mail, Phone, Globe, Map, MapPin,
  Rocket, Sparkles, Zap, Flame, Trophy, Target, Compass, Coffee,
  Utensils, Pizza, Dumbbell, Bike, Plane, Car, Building2, Cpu,
  Cloud, Database, Server, Shield, Lock, Key, Settings, Wrench,
  Layers, Grid3x3, Package, Gift, Tag, Megaphone, Youtube, Instagram,
  Twitter, Github, Linkedin, Facebook, Twitch, Rss, PenTool, Feather,
  Lightbulb, Brain, Eye, Search, Tv, Radio, Headphones, Mic,
  Store, Wallet, Landmark, Leaf, TreePine, Sun, Moon, Cat,
  type LucideIcon,
} from "lucide-react";

export interface CategoryIconDef {
  key: string;
  label: string;
  icon: LucideIcon;
  group: string;
}

// Curated professional pack: ~90 icons grouped for the picker.
export const CATEGORY_ICONS: CategoryIconDef[] = [
  // Geral
  { key: "folder", label: "Pasta", icon: Folder, group: "Geral" },
  { key: "link", label: "Link", icon: Link2, group: "Geral" },
  { key: "star", label: "Favorito", icon: Star, group: "Geral" },
  { key: "heart", label: "Curtir", icon: Heart, group: "Geral" },
  { key: "bookmark", label: "Marcador", icon: Bookmark, group: "Geral" },
  { key: "tag", label: "Etiqueta", icon: Tag, group: "Geral" },
  { key: "layers", label: "Camadas", icon: Layers, group: "Geral" },
  { key: "grid", label: "Grade", icon: Grid3x3, group: "Geral" },
  { key: "package", label: "Pacote", icon: Package, group: "Geral" },
  { key: "gift", label: "Presente", icon: Gift, group: "Geral" },
  { key: "sparkles", label: "Destaques", icon: Sparkles, group: "Geral" },
  { key: "trophy", label: "Troféu", icon: Trophy, group: "Geral" },
  { key: "target", label: "Alvo", icon: Target, group: "Geral" },
  { key: "compass", label: "Bússola", icon: Compass, group: "Geral" },
  { key: "flame", label: "Trending", icon: Flame, group: "Geral" },
  { key: "zap", label: "Rápido", icon: Zap, group: "Geral" },
  { key: "rocket", label: "Lançamento", icon: Rocket, group: "Geral" },
  { key: "lightbulb", label: "Ideias", icon: Lightbulb, group: "Geral" },

  // Trabalho & Estudos
  { key: "briefcase", label: "Trabalho", icon: Briefcase, group: "Trabalho & Estudos" },
  { key: "graduation", label: "Estudos", icon: GraduationCap, group: "Trabalho & Estudos" },
  { key: "book", label: "Livro", icon: Book, group: "Trabalho & Estudos" },
  { key: "newspaper", label: "Notícias", icon: Newspaper, group: "Trabalho & Estudos" },
  { key: "pen", label: "Escrever", icon: PenTool, group: "Trabalho & Estudos" },
  { key: "feather", label: "Blog", icon: Feather, group: "Trabalho & Estudos" },
  { key: "brain", label: "Aprendizado", icon: Brain, group: "Trabalho & Estudos" },
  { key: "megaphone", label: "Marketing", icon: Megaphone, group: "Trabalho & Estudos" },
  { key: "building", label: "Empresa", icon: Building2, group: "Trabalho & Estudos" },
  { key: "landmark", label: "Instituição", icon: Landmark, group: "Trabalho & Estudos" },

  // Criativo
  { key: "palette", label: "Design", icon: Palette, group: "Criativo" },
  { key: "camera", label: "Foto", icon: Camera, group: "Criativo" },
  { key: "music", label: "Música", icon: Music, group: "Criativo" },
  { key: "film", label: "Filmes", icon: Film, group: "Criativo" },
  { key: "gamepad", label: "Games", icon: Gamepad2, group: "Criativo" },
  { key: "tv", label: "TV", icon: Tv, group: "Criativo" },
  { key: "radio", label: "Rádio", icon: Radio, group: "Criativo" },
  { key: "headphones", label: "Podcasts", icon: Headphones, group: "Criativo" },
  { key: "mic", label: "Microfone", icon: Mic, group: "Criativo" },

  // Tech
  { key: "code", label: "Código", icon: Code2, group: "Tech" },
  { key: "cpu", label: "Hardware", icon: Cpu, group: "Tech" },
  { key: "cloud", label: "Cloud", icon: Cloud, group: "Tech" },
  { key: "database", label: "Dados", icon: Database, group: "Tech" },
  { key: "server", label: "Servidor", icon: Server, group: "Tech" },
  { key: "shield", label: "Segurança", icon: Shield, group: "Tech" },
  { key: "lock", label: "Privado", icon: Lock, group: "Tech" },
  { key: "key", label: "Acesso", icon: Key, group: "Tech" },
  { key: "settings", label: "Config", icon: Settings, group: "Tech" },
  { key: "wrench", label: "Ferramentas", icon: Wrench, group: "Tech" },

  // Redes sociais
  { key: "youtube", label: "YouTube", icon: Youtube, group: "Redes sociais" },
  { key: "instagram", label: "Instagram", icon: Instagram, group: "Redes sociais" },
  { key: "twitter", label: "X / Twitter", icon: Twitter, group: "Redes sociais" },
  { key: "github", label: "GitHub", icon: Github, group: "Redes sociais" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, group: "Redes sociais" },
  { key: "facebook", label: "Facebook", icon: Facebook, group: "Redes sociais" },
  { key: "twitch", label: "Twitch", icon: Twitch, group: "Redes sociais" },
  { key: "rss", label: "RSS / Feed", icon: Rss, group: "Redes sociais" },

  // Contato
  { key: "mail", label: "E-mail", icon: Mail, group: "Contato" },
  { key: "phone", label: "Telefone", icon: Phone, group: "Contato" },
  { key: "message", label: "Chat", icon: MessageCircle, group: "Contato" },
  { key: "users", label: "Comunidade", icon: Users, group: "Contato" },
  { key: "user", label: "Perfil", icon: User, group: "Contato" },

  // Loja & finanças
  { key: "bag", label: "Loja", icon: ShoppingBag, group: "Loja & Finanças" },
  { key: "cart", label: "Carrinho", icon: ShoppingCart, group: "Loja & Finanças" },
  { key: "store", label: "Marca", icon: Store, group: "Loja & Finanças" },
  { key: "card", label: "Cartão", icon: CreditCard, group: "Loja & Finanças" },
  { key: "wallet", label: "Carteira", icon: Wallet, group: "Loja & Finanças" },
  { key: "dollar", label: "Preço", icon: DollarSign, group: "Loja & Finanças" },
  { key: "trending", label: "Investir", icon: TrendingUp, group: "Loja & Finanças" },
  { key: "chart", label: "Métricas", icon: LineChart, group: "Loja & Finanças" },

  // Lifestyle
  { key: "home", label: "Casa", icon: Home, group: "Lifestyle" },
  { key: "coffee", label: "Café", icon: Coffee, group: "Lifestyle" },
  { key: "food", label: "Comida", icon: Utensils, group: "Lifestyle" },
  { key: "pizza", label: "Delivery", icon: Pizza, group: "Lifestyle" },
  { key: "dumbbell", label: "Fitness", icon: Dumbbell, group: "Lifestyle" },
  { key: "bike", label: "Esporte", icon: Bike, group: "Lifestyle" },
  { key: "plane", label: "Viagem", icon: Plane, group: "Lifestyle" },
  { key: "car", label: "Carro", icon: Car, group: "Lifestyle" },
  { key: "map", label: "Mapa", icon: Map, group: "Lifestyle" },
  { key: "pin", label: "Local", icon: MapPin, group: "Lifestyle" },
  { key: "globe", label: "Global", icon: Globe, group: "Lifestyle" },
  { key: "leaf", label: "Natureza", icon: Leaf, group: "Lifestyle" },
  { key: "tree", label: "Ecologia", icon: TreePine, group: "Lifestyle" },
  { key: "sun", label: "Dia", icon: Sun, group: "Lifestyle" },
  { key: "moon", label: "Noite", icon: Moon, group: "Lifestyle" },
  { key: "cat", label: "Pets", icon: Cat, group: "Lifestyle" },
  { key: "eye", label: "Descobrir", icon: Eye, group: "Lifestyle" },
  { key: "search", label: "Pesquisar", icon: Search, group: "Lifestyle" },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICONS.map((i) => [i.key, i.icon]),
);

export const DEFAULT_CATEGORY_ICON = "folder";

export function getCategoryIcon(key: string | null | undefined): LucideIcon {
  if (!key) return Folder;
  return ICON_MAP[key] ?? Folder;
}

export function CategoryIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = getCategoryIcon(name);
  return <Icon className={className} aria-hidden />;
}

export const CATEGORY_ICON_GROUPS: string[] = Array.from(
  new Set(CATEGORY_ICONS.map((i) => i.group)),
);
