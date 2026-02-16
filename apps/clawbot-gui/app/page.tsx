'use client';

import { useState } from 'react';
import {
  Terminal, Play, MessageSquare, Settings, Activity,
  Wifi, Users, Brain, Shield, Database, Send,
  Smartphone, Globe, Bot, RefreshCw, Power, FileText,
  Box, Code, ShieldCheck, Cpu, LayoutGrid, Puzzle,
  Trash2, Zap, Clock, Search, ChevronRight, X, Plus,
  Minus, Wand2, Rocket, Server, RotateCcw, Info,
  HelpCircle, PowerOff, MessageCircle, LogIn, LogOut,
  Hash, List, Download, History, Camera, Link, Check,
  Edit, Eye, Folder, Key, Lock, Mail, MapPin,
  Monitor, Star, Upload, User, Video, Volume2,
  AlertCircle, ArrowRight, BarChart, Bell, Book,
  Briefcase, Brush, Bug, Building, Car, Cloud,
  Coffee, Compass, Copy, CreditCard, Crop, Crosshair,
  Crown, Disc, Divide, DollarSign, Droplet, Dumbbell,
  Egg, Flag, Flame, Flashlight, Flower, Framer,
  Frown, Gamepad, Gift, GitBranch, Github, Gitlab,
  Glasses, Globe2, GraduationCap, Grip, Group,
  Hammer, Hand, Headphones, Heart, Hexagon, Home,
  Image, Inbox, Indent, Infinity, Inspect, Joystick,
  Keyboard, Laptop, Layers, Leaf, Library, LifeBuoy,
  Lightbulb, LineChart, Loader, Locate, Maximize,
  Megaphone, Menu, Mic, Minimize, MonitorPlay,
  MoreHorizontal, MoreVertical, MousePointer, Move,
  Music, Navigation, Network, Octagon, Option,
  Outdent, Package, Paintbrush, Paperclip, Pause,
  Pen, Pencil, Percent, Phone, PieChart, Pin,
  Plane, Printer, QrCode, Radio, Receipt, Redo,
  Repeat, Rewind, Rss, Ruler, Scissors, Share,
  Share2, ShieldOff, Shirt, ShoppingBag, ShoppingCart,
  Shuffle, Sidebar, Signal, Slash, Sliders,
  Snowflake, Space, Speaker, Square, Store, Sunrise,
  Sunset, Tablet, Tag, Target, Tent, Thermometer,
  ThumbsDown, ThumbsUp, Ticket, Timer, ToggleLeft,
  ToggleRight, Trello, TrendingDown, TrendingUp,
  Triangle, Truck, Tv, Twitch, Twitter, Type,
  Umbrella, Underline, Undo, Unlock, View, Voicemail,
  Volume, Volume1, VolumeX, Watch, Waves, Webcam,
  WifiOff, Wind, Youtube, ZoomIn, ZoomOut, Stethoscope,
  Wrench, Grid3X3, AlertTriangle, Save, FileCode,
  ArrowUpRight, ArrowDown, ArrowUp, ArrowLeft,
  AlignCenter, AlignLeft, AlignRight, Anchor, Aperture,
  Award, Baby, Backpack, Badge, Ban,
  Banknote, Baseline, Bath, Battery, BatteryCharging,
  BatteryFull, BatteryLow, BatteryMedium,
  BatteryWarning, Beaker, Bean, BeanOff, Bed, BedDouble,
  BedSingle, Beef, Beer, Bike, Binary, Bird, Bitcoin,
  Blinds, Blocks, Bluetooth, BluetoothConnected,
  BluetoothOff, BluetoothSearching, Bold, Bomb, Bone,
  BookOpen, BookOpenCheck, Bookmark, BookmarkMinus,
  BookmarkPlus, BoxSelect, Boxes, Braces,
  Brackets, BrainCircuit, BrainCog, BrickWall,
  Bus, BusFront, Cable, Calculator, CalendarCheck,
  CalendarClock, CalendarDays, CalendarHeart,
  CalendarMinus, CalendarPlus, CalendarRange, CalendarX,
  CameraOff, Candy, CandyOff, CarFront, Carrot,
  CaseLower, CaseSensitive, CaseUpper, Cast, Castle,
  Cat, CheckCheck, CheckCircle, CheckCircle2,
  CheckSquare, ChefHat, Cherry, ChevronDown,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronUp,
  ChevronsDown, ChevronsDownUp, ChevronsLeft,
  ChevronsLeftRight, ChevronsRight, ChevronsUp,
  ChevronsUpDown, Chrome, Church, Cigarette,
  CigaretteOff, Circle, CircleDashed, CircleDollarSign,
  CircleDot, CircleEllipsis, CircleEqual, CircleOff,
  CircleSlash, CircuitBoard, Citrus, Clapperboard,
  ClipboardCheck, ClipboardCopy, ClipboardList,
  ClipboardPaste, ClipboardSignature, ClipboardType,
  ClipboardX, Clock1, Clock10, Clock11, Clock12,
  Clock2, Clock3, Clock4, Clock5, Clock6, Clock7,
  Clock8, Clock9, CloudCog, CloudDrizzle, CloudFog,
  CloudHail, CloudLightning, CloudMoon, CloudMoonRain,
  CloudOff, CloudRain, CloudRainWind, CloudSnow,
  CloudSun, CloudSunRain, Cloudy, Clover, Club,
  Code2, Codepen, Codesandbox, Cog, Coins,
  Columns, Combine, Component,
  ConciergeBell, Construction, Contact, Contact2,
  Contrast, Cookie, CopyCheck, CopyPlus, CopyX,
  CornerDownLeft, CornerDownRight, CornerLeftDown,
  CornerLeftUp, CornerRightDown, CornerRightUp,
  CornerUpLeft, CornerUpRight, CreativeCommons,
  Croissant, Cross, CupSoda, Currency,
  DatabaseBackup, DatabaseZap, Delete, Diamond, Dice1,
  Dice2, Dice3, Dice4, Dice5, Dice6, Dices, Diff,
  DiscAlbum, DivideCircle, DivideSquare, Dna, Dog,
  Donut, DoorClosed, DoorOpen, Dot, Dribbble,
  Droplets, Drumstick, Ear, EarOff, Earth,
  EarthLock, Eclipse, EggFried, Equal, EqualNot,
  Eraser, Euro, Expand, EyeOff,
  Facebook, Factory, Fan, FastForward, Feather, Fence,
  FerrisWheel, Figma, File, FileArchive, FileAudio,
  FileAudio2, FileAxis3d, FileBadge, FileBadge2,
  FileBarChart, FileBarChart2, FileBox, FileCheck,
  FileCheck2, FileClock, FileCode2, FileCog, FileDiff,
  FileDigit, FileDown, FileEdit, FileHeart, FileImage,
  FileInput, FileJson, FileKey, FileKey2, FileLineChart,
  FileLock, FileLock2, FileMinus, FileMinus2,
  FileOutput, FilePieChart, FilePlus, FilePlus2,
  FileQuestion, FileScan, FileSearch, FileSearch2,
  FileSignature, FileSpreadsheet, FileStack, FileSymlink,
  FileTerminal, FileType, FileType2, FileUp, FileVideo,
  FileVideo2, FileVolume, FileVolume2, FileWarning,
  FileX, FileX2, Files, Film, Filter, FilterX,
  Fingerprint, Fish, FishOff, FishSymbol, FlagOff,
  FlagTriangleLeft, FlagTriangleRight, FlameKindling,
  FlashlightOff, FlaskConical, FlaskConicalOff,
  FlaskRound, FlipHorizontal, FlipHorizontal2,
  FlipVertical, FlipVertical2, Flower2, Focus,
  FoldHorizontal, FoldVertical, FolderArchive,
  FolderCheck, FolderClock, FolderClosed, FolderCog,
  FolderDot, FolderDown, FolderEdit, FolderGit,
  FolderGit2, FolderHeart, FolderInput, FolderKanban,
  FolderKey, FolderLock, FolderMinus, FolderOpen,
  FolderOutput, FolderPlus, FolderRoot, FolderSearch,
  FolderSearch2, FolderSymlink, FolderSync, FolderTree,
  FolderUp, FolderX, Folders, Footprints, Forklift,
  FormInput, Forward, Frame, Fuel, FunctionSquare,
  Gamepad2, Gauge, Gavel, Gem, Ghost, GiftIcon,
  GitCommit, GitCommitHorizontal, GitCommitVertical,
  GitCompare, GitCompareArrows, GitFork, GitGraph,
  GitMerge, GitPullRequest, GitPullRequestArrow,
  GitPullRequestClosed, GitPullRequestCreate,
  GitPullRequestCreateArrow, GitPullRequestDraft,
  GlassWater, Goal, Grab, Grape, GripHorizontal,
  GripVertical, Guitar, HandMetal, HardHat,
  Heading, Heading1, Heading2, Heading3, Heading4,
  Heading5, Heading6, Headset, HeartCrack,
  HeartHandshake, HeartOff, HeartPulse, HelpingHand,
  Highlighter, HistoryIcon, Hop, HopOff, Hospital,
  Hotel, Hourglass, IceCream, IceCream2, ImageMinus,
  ImageOff, ImagePlus, Images, Import, IndentIcon,
  IndianRupee, InfoIcon, InspectIcon, Instagram,
  Italic, IterationCcw, IterationCw, JapaneseYen,
  Kanban, KeyRound, KeySquare, Lamp, LampCeiling,
  LampDesk, LampFloor, LampWallDown, LampWallUp,
  LandPlot, Landmark, Languages, Laptop2, Lasso,
  LassoSelect, Laugh, Layout, LayoutDashboard,
  LayoutList, LayoutPanelLeft, LayoutPanelTop,
  LayoutTemplate, LeafIcon, LifeBuoyIcon, LightbulbOff,
  LineChartIcon, Link2, Link2Off, Linkedin,
  ListChecks, ListCollapse, ListEnd, ListFilter,
  ListMinusIcon, ListMusic, ListOrdered, ListPlusIcon,
  ListRestart, ListStart, ListTree, ListVideo,
  Loader2, LocateFixed, LocateOff, LockIcon, LogInIcon,
  LogOutIcon, Luggage, Magnet, MailCheck, MailMinus,
  MailOpen, MailPlus, MailQuestion, MailSearch,
  MailWarning, MailX, Mailbox, Mails, MapIcon,
  MapPinOff, MapPinned, Martini, Maximize2, Medal,
  MegaphoneOff, Meh, MemoryStick, MenuSquare, Merge,
  MessageCircleDashed, MessageCircleOff, MessageSquareDashed,
  MessageSquareDiff, MessageSquareDot, MessageSquareOff,
  MessageSquarePlus, MessagesSquare, Mic2, MicOff,
  Microscope, Microwave, Milestone, Milk, MilkOff,
  Minimize2, MinusCircle, MinusSquare, MonitorCheck,
  MonitorDot, MonitorDown, MonitorOff, MonitorPause,
  MonitorSmartphone, MonitorSpeaker, MonitorStop,
  MonitorUp, MonitorX, MoonStar, Mountain, MountainSnow,
  Mouse, MousePointer2, MousePointerClick, Move3d,
  MoveDiagonal, MoveDiagonal2, MoveHorizontal,
  MoveVertical, Music2, Music3, Music4, Navigation2,
  Navigation2Off, NavigationOff, Newspaper, Nfc,
  Notebook, NotebookPen, NotebookTabs, NotepadText,
  Nut, NutOff, OctagonAlert, OctagonPause, OctagonX,
  Package2, PackageCheck, PackageMinus, PackageOpen,
  PackagePlus, PackageSearch, PackageX, PaintBucket,
  Paintbrush2, Palette, Palmtree, PanelBottom,
  PanelBottomClose, PanelBottomInactive, PanelBottomOpen,
  PanelLeft, PanelLeftClose, PanelLeftInactive,
  PanelLeftOpen, PanelRight, PanelRightClose,
  PanelRightInactive, PanelRightOpen, PanelTop,
  PanelTopClose, PanelTopInactive, PanelTopOpen,
  PanelsLeftBottom, PanelsRightBottom, PanelsTopLeft,
  PaperclipIcon, Parentheses, ParkingCircle,
  ParkingCircleOff, ParkingMeter, ParkingSquare,
  ParkingSquareOff, PartyPopper, PauseCircle,
  PauseOctagon, PawPrint, PcCase, PenLine, PenTool,
  PencilLine, PencilRuler, Pentagon, PercentCircle,
  PercentDiamond, PercentSquare, PersonStanding, PhoneCall,
  PhoneForwarded, PhoneIncoming, PhoneMissed, PhoneOff,
  PhoneOutgoing, Pi, PiSquare, PictureInPicture,
  PictureInPicture2, PiggyBank, Pilcrow, PilcrowSquare,
  Pill, PinOff, Pipette, Pizza, PlaneLanding,
  PlaneTakeoff, PlayCircle, PlaySquare, Plug, Plug2,
  PlugZap, PlusCircle, PlusSquare, Pocket, Podcast,
  Pointer, Popsicle, PoundSterling, PowerCircle,
  PowerSquare, Presentation, Projector, Proportions,
  Quote, Rabbit, Radar, Radiation, RadioReceiver,
  RadioTower, Radius, RailSymbol, Rainbow, Rat,
  ReceiptCent, ReceiptEuro, ReceiptIndianRupee,
  ReceiptJapaneseYen, ReceiptPoundSterling,
  ReceiptRussianRuble, ReceiptSwissFranc, ReceiptText,
  RectangleHorizontal, RectangleVertical, Recycle,
  Redo2, RedoDot, Refrigerator, Regex,
  RemoveFormatting, Repeat1, Repeat2, Replace,
  ReplaceAll, Reply, ReplyAll, RockingChair,
  RollerCoaster, Rotate3d, RotateCw, Router, Rows,
  RussianRuble, Sailboat, Salad, Sandwich, Satellite,
  SatelliteDish, SaveAll, Scale, Scale3d, Scaling,
  ScanBarcode, ScanEye, ScanFace, ScanLine, ScanSearch,
  ScanText, ScatterChart, School, School2,
  ScissorsLineDashed, ScreenShare, ScreenShareOff,
  Scroll, ScrollText, SearchCheck, SearchCode,
  SearchSlash, SearchX, SendHorizonal, SendToBack,
  SeparatorHorizontal, SeparatorVertical, ServerCog,
  ServerCrash, ServerOff, Settings2, Shapes,
  Shell, ShieldAlert, ShieldBan, ShieldClose,
  ShieldEllipsis, ShieldHalf, ShieldMinus,
  ShieldPlus, ShieldQuestion, Ship, ShipWheel,
  ShoppingBasket, ShowerHead, Shovel, Shrink,
  SidebarClose, SidebarOpen, Sigma, SigmaSquare,
  SignalHigh, SignalLow, SignalMedium, SignalZero,
  Signpost, SignpostBig, Siren, SkipBack, SkipForward,
  Skull, Slack, Slice, SmartphoneCharging,
  SmartphoneNfc, Smile, SnowflakeIcon, Sofa, Soup,
  Spade, Sparkle, Sparkles, Speech,
  SpellCheck, SpellCheck2, Spline, Split, SprayCan,
  Sprout, SquareAsterisk, SquareCode, SquareDashedBottom,
  SquareDashedBottomCode, SquareDot, SquareEqual,
  SquareSlash, SquareStack, Squirrel, Stamp, StarHalf,
  StarOff, StepBack, StepForward, Sticker, StickyNote,
  StopCircle, StretchHorizontal, StretchVertical,
  Strikethrough, Subscript, Subtitles, SunDim,
  SunMedium, SunMoon, Superscript, SwissFranc,
  SwitchCamera, Sword, Swords, Syringe, Table, Table2,
  TableProperties, TabletSmartphone, Tablets,
  Tags, TargetIcon, TentTree, TerminalSquare,
  TestTube, TestTube2, TestTubes, Text, TextCursor,
  TextCursorInput, TextQuote, TextSelect, TextSearch,
  Theater, ThermometerSnowflake, ThermometerSun,
  TicketCheck, TicketMinus, TicketPercent, TicketPlus,
  TicketSlash, TicketX, TimerOff, TimerReset,
  Tornado, Touchpad, TouchpadOff, TowerControl,
  ToyBrick, Tractor, TrafficCone, Train, TrainFront,
  TrainFrontTunnel, TrainTrack, TramFront, Trash,
  TreeDeciduous, TreePine, Trees, TrelloIcon,
  TriangleRight, Trophy,
  Tv2, Turtle, UnlockIcon, UploadCloud,
  Usb, UserCheck, UserCog, UserMinus, UserPlus,
  UserRound, UserRoundCheck, UserRoundCog,
  UserRoundMinus, UserRoundPlus, UserRoundSearch,
  UserRoundX, UserSearch, UserX, UsersRound, Utensils,
  UtensilsCrossed, UtilityPole, Variable, Vault, Vegan,
  VenetianMask, Verified, Vibrate, VibrateOff,
  VideoOff, Videotape, ViewIcon, Wallet, Wallet2,
  WalletCards, Wallpaper, Wand, Warehouse, WebhookOff,
  Weight, Wheat, WheatOff, WholeWord, Wine, WineOff,
  Workflow, WrapText
} from 'lucide-react';

interface CommandDef {
  id: string;
  category: string;
  label: string;
  command: string;
  icon: any;
  description?: string;
  args?: { name: string; placeholder: string; required?: boolean; flag?: string }[];
}

const allCommands: CommandDef[] = [
  // Core Status & Info
  { id: 'status', category: 'Core', label: 'Status', command: 'status', icon: Activity, description: 'Show gateway status' },
  { id: 'health', category: 'Core', label: 'Health Check', command: 'doctor', icon: Stethoscope, description: 'Run health checks' },
  { id: 'version', category: 'Core', label: 'Version', command: '--version', icon: Info, description: 'Show version' },
  { id: 'help', category: 'Core', label: 'Help', command: '--help', icon: HelpCircle, description: 'Show CLI help' },

  // Gateway Control
  { id: 'gateway-start', category: 'Gateway', label: 'Start Gateway', command: 'gateway --verbose', icon: Power, description: 'Start gateway with logs' },
  { id: 'gateway-dev', category: 'Gateway', label: 'Dev Mode', command: 'gateway --dev', icon: Code, description: 'Development mode' },
  { id: 'gateway-logs', category: 'Gateway', label: 'View Logs', command: 'logs tail --lines 100', icon: FileText, description: 'Show last 100 lines' },
  { id: 'dashboard', category: 'Gateway', label: 'Dashboard', command: 'dashboard', icon: LayoutGrid, description: 'Open web UI' },

  // Agent Commands
  { id: 'agent-chat', category: 'Agent', label: 'Chat', command: 'agent --message', icon: MessageCircle, description: 'Send message to agent', args: [{ name: 'msg', placeholder: 'Hello!', required: true, flag: '--message' }] },
  { id: 'agent-thinking', category: 'Agent', label: 'High Thinking', command: 'agent --message --thinking high', icon: Brain, description: 'Complex reasoning', args: [{ name: 'msg', placeholder: 'Question...', required: true, flag: '--message' }] },
  { id: 'agents-list', category: 'Agent', label: 'List Agents', command: 'agents list', icon: Users, description: 'All agents' },
  { id: 'agents-create', category: 'Agent', label: 'Create', command: 'agents create', icon: Plus, description: 'New agent', args: [{ name: 'name', placeholder: 'my-agent', required: true }] },

  // Channels Management
  { id: 'channels-list', category: 'Channels', label: 'List Channels', command: 'channels list', icon: List, description: 'All channels' },
  { id: 'channels-whatsapp', category: 'Channels', label: 'WhatsApp QR', command: 'channels login whatsapp', icon: Smartphone, description: 'Link WhatsApp' },
  { id: 'channels-telegram', category: 'Channels', label: 'Telegram Bot', command: 'channels login telegram', icon: Send, description: 'Setup Telegram' },
  { id: 'channels-discord', category: 'Channels', label: 'Discord Bot', command: 'channels login discord', icon: MessageSquare, description: 'Setup Discord' },
  { id: 'channels-slack', category: 'Channels', label: 'Slack Bot', command: 'channels login slack', icon: Hash, description: 'Setup Slack' },

  // Messaging
  { id: 'message-send', category: 'Messages', label: 'Send Message', command: 'message send --message', icon: Send, description: 'Send message', args: [{ name: 'msg', placeholder: 'Hello!', required: true, flag: '--message' }] },
  { id: 'message-list', category: 'Messages', label: 'List Messages', command: 'message list --limit 20', icon: List, description: 'Recent messages' },

  // Models
  { id: 'models-list', category: 'Models', label: 'List Models', command: 'models list', icon: Cpu, description: 'AI models' },
  { id: 'model-set', category: 'Models', label: 'Set Model', command: 'config set agent.model', icon: Settings, description: 'Change model', args: [{ name: 'model', placeholder: 'claude-opus-4-6', required: true }] },

  // Skills
  { id: 'skills-list', category: 'Skills', label: 'List Skills', command: 'skills list', icon: Puzzle, description: 'Installed skills' },
  { id: 'skills-install', category: 'Skills', label: 'Install', command: 'skills install', icon: Download, description: 'Add skill', args: [{ name: 'skill', placeholder: 'skill-name', required: true }] },

  // Memory
  { id: 'memory-list', category: 'Memory', label: 'List', command: 'memory list', icon: List, description: 'All entries' },
  { id: 'memory-search', category: 'Memory', label: 'Search', command: 'memory search', icon: Search, description: 'Search memory', args: [{ name: 'q', placeholder: 'query...', required: true, flag: '--query' }] },
  { id: 'memory-clear', category: 'Memory', label: 'Clear All', command: 'memory clear', icon: Trash2, description: 'Delete all' },

  // Sessions
  { id: 'sessions-list', category: 'Sessions', label: 'List', command: 'sessions list', icon: List, description: 'Active sessions' },
  { id: 'sessions-reset', category: 'Sessions', label: 'Reset', command: 'sessions reset', icon: RotateCcw, description: 'Reset current' },

  // Browser
  { id: 'browser-open', category: 'Browser', label: 'Open', command: 'browser open', icon: Globe, description: 'Launch browser', args: [{ name: 'url', placeholder: 'https://...', flag: '--url' }] },
  { id: 'browser-snapshot', category: 'Browser', label: 'Screenshot', command: 'browser snapshot', icon: Camera, description: 'Capture page' },
  { id: 'browser-close', category: 'Browser', label: 'Close', command: 'browser close', icon: X, description: 'Close browser' },

  // Cron
  { id: 'cron-list', category: 'Cron', label: 'List', command: 'cron list', icon: List, description: 'Cron jobs' },
  { id: 'cron-add', category: 'Cron', label: 'Add', command: 'cron add', icon: Plus, description: 'Schedule job', args: [{ name: 'schedule', placeholder: '0 9 * * *', required: true, flag: '--schedule' }, { name: 'cmd', placeholder: 'command', required: true, flag: '--command' }] },

  // Webhooks
  { id: 'webhooks-list', category: 'Webhooks', label: 'List', command: 'webhooks list', icon: List, description: 'Webhooks' },

  // Nodes
  { id: 'nodes-list', category: 'Nodes', label: 'List', command: 'nodes list', icon: List, description: 'Devices' },

  // Pairing
  { id: 'pairing-list', category: 'Pairing', label: 'List', command: 'pairing list', icon: List, description: 'Pairings' },

  // Plugins
  { id: 'plugins-list', category: 'Plugins', label: 'List', command: 'plugins list', icon: Box, description: 'Plugins' },
  { id: 'plugins-install', category: 'Plugins', label: 'Install', command: 'plugins install', icon: Download, description: 'Add plugin', args: [{ name: 'plugin', placeholder: 'plugin-name', required: true, flag: '--plugin' }] },

  // Config
  { id: 'config-get', category: 'Config', label: 'Get', command: 'config get', icon: Eye, description: 'Read value', args: [{ name: 'key', placeholder: 'agent.model', required: true, flag: '--key' }] },
  { id: 'config-set', category: 'Config', label: 'Set', command: 'config set', icon: Edit, description: 'Update config', args: [{ name: 'key', placeholder: 'agent.model', required: true, flag: '--key' }, { name: 'value', placeholder: 'value', required: true, flag: '--value' }] },
  { id: 'configure', category: 'Config', label: 'Wizard', command: 'configure', icon: Wand2, description: 'Setup wizard' },

  // Setup
  { id: 'onboard', category: 'Setup', label: 'Onboard', command: 'onboard', icon: Rocket, description: 'First setup' },
  { id: 'reset', category: 'Setup', label: 'Reset', command: 'reset', icon: RotateCcw, description: 'Reset all' },
  { id: 'update', category: 'Setup', label: 'Update', command: 'update', icon: RefreshCw, description: 'Update CLI' },
  { id: 'doctor', category: 'Setup', label: 'Doctor', command: 'doctor', icon: Stethoscope, description: 'Diagnostics' },

  // System
  { id: 'system-info', category: 'System', label: 'System Info', command: 'system info', icon: Info, description: 'OS/process info' },
  { id: 'tui', category: 'System', label: 'TUI', command: 'tui', icon: Terminal, description: 'Terminal UI' },

  // Security
  { id: 'security-status', category: 'Security', label: 'Status', command: 'security status', icon: Shield, description: 'Security status' },
  { id: 'approvals-list', category: 'Security', label: 'Approvals', command: 'approvals list', icon: List, description: 'Pending approvals' },
];

export default function Dashboard() {
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);
  const [customCommand, setCustomCommand] = useState('');

  const runCommand = async (cmd: string, label: string) => {
    setLoading(label);
    setOutput(prev => prev + `\n\n$ openclaw ${cmd}\n` + '='.repeat(50) + '\n');

    try {
      const response = await fetch('/api/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });

      const data = await response.json();

      if (data.success) {
        setOutput(prev => prev + (data.stdout || 'Command executed successfully') + '\n');
      } else {
        setOutput(prev => prev + `ERROR: ${data.error}\n${data.stderr || ''}\n`);
      }
    } catch (error) {
      setOutput(prev => prev + `ERROR: ${error}\n`);
    } finally {
      setLoading(null);
    }
  };

  const runCustomCommand = () => {
    if (customCommand.trim()) {
      runCommand(customCommand.trim(), 'custom');
      setCustomCommand('');
    }
  };

  const clearOutput = () => {
    setOutput('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">OpenClaw GUI</h1>
            <p className="text-sm text-slate-400">Personal AI Assistant Control Center</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => runCommand('status', 'status')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Refresh Status
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Commands ({allCommands.length})
          </h2>
          <div className="space-y-1">
            {allCommands.slice(0, 20).map((cmd: CommandDef) => (
              <button
                key={cmd.id}
                onClick={() => runCommand(cmd.command, cmd.label)}
                disabled={loading === cmd.label}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left disabled:opacity-50"
              >
                <cmd.icon className="w-4 h-4 text-orange-400" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{loading === cmd.label ? 'Running...' : cmd.label}</span>
                  {cmd.description && <p className="text-xs text-slate-500 truncate">{cmd.description}</p>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-6 gap-4">
          {/* Custom Command */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Custom Command</h3>
            <div className="flex gap-2">
              <span className="px-3 py-2 bg-slate-800 rounded-lg text-slate-400 text-sm font-mono">
                openclaw
              </span>
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runCustomCommand()}
                placeholder="Enter command (e.g., 'agent --message Hello')"
                className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-700 focus:border-orange-500 focus:outline-none font-mono"
              />
              <button
                onClick={runCustomCommand}
                disabled={loading === 'custom'}
                title="Run command"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Output Terminal */}
          <div className="flex-1 bg-black rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">Output</span>
              </div>
              <button
                onClick={clearOutput}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-sm">
              {output ? (
                <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
              ) : (
                <p className="text-slate-600 italic">Run a command to see output...</p>
              )}
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-slate-400">Gateway</span>
              </div>
              <p className="text-lg font-bold text-white">Offline</p>
              <p className="text-xs text-slate-500">ws://localhost:18789</p>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-slate-400">AI Model</span>
              </div>
              <p className="text-lg font-bold text-white">Claude</p>
              <p className="text-xs text-slate-500">Anthropic API Ready</p>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-slate-400">Channels</span>
              </div>
              <p className="text-lg font-bold text-white">0 Active</p>
              <p className="text-xs text-slate-500">Configure in CLI</p>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-medium text-slate-400">Version</span>
              </div>
              <p className="text-lg font-bold text-white">2026.2.16</p>
              <p className="text-xs text-slate-500">OpenClaw Latest</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
