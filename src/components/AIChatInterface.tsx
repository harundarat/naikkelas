/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";
import { createClientSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OnboardingModal from "./OnboardingModal";
import MarkdownRenderer from "./MarkdownRenderer";
import ChatInput from "./ChatInput";
import ChatImage from "./ChatImage";
import {
  MessageSquarePlus,
  MessageSquareOff,
  Compass,
  Library,
  Clock,
  PanelLeftOpen,
  PanelLeftClose,
  User as UserIcon,
  CreditCard,
  LogOut,
} from "lucide-react";
import ChatHistoryList from "./ChatHistoryList"; // Import ChatHistoryList
import PromptBuilder from "./PromptBuilder"; // Import PromptBuilder
import TypingMessage from "./TypingMessage"; // Import TypingMessage
import MediaLibrary from "./MediaLibrary"; // Import MediaLibrary
import CreditsDisplay from "./CreditsDisplay"; // Import CreditsDisplay
import TopupSheet from "./TopupSheet"; // Import TopupSheet
import RewardsDisplay from "./RewardsDisplay"; // Import RewardsDisplay
import ReferralSheet from "./ReferralSheet"; // Import ReferralSheet

const navItems = [
  { icon: Compass, label: "Explore" },
  { icon: Library, label: "Library" },
];

const LOADING_MESSAGES = [
  "Thinking...",
  "Consulting the digital spirits...",
  "Brewing a response...",
  "Connecting to the knowledge matrix...",
  "Untangling the web of data...",
  "Analyzing the possibilities...",
  "Asking the oracle...",
  "Simulating 1000 futures...",
];

interface Message {
  id: string;
  type: "user" | "ai";
  text: string;
  image?: string;
  video?: string;
  suggestions?: string[];
  timestamp: Date;
  isNew?: boolean;
}

interface Chat { // Define Chat interface
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface UserProfile extends User {
  name: string | null;
}

export default function AIChatInterface() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [isCreditsLoading, setIsCreditsLoading] = useState(true);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [rewardBalance, setRewardBalance] = useState<number>(0);
  const [isRewardsLoading, setIsRewardsLoading] = useState(true);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientSupabaseClient();

  const [chats, setChats] = useState<Chat[]>([]); // State for chat history
  const [chatId, setChatId] = useState<string | null>(null); // State for current chat ID
  const [isHistoryVisible, setIsHistoryVisible] = useState(true); // State for chat history visibility
  const [activeView, setActiveView] = useState<'chat' | 'explore' | 'library'>('chat'); // State for active view
  const initialFetchDone = useRef(false); // Ref to track if the initial fetch has been done

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const markMessageAsOld = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, isNew: false } : msg))
    );
  };

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session && !initialFetchDone.current) {
        initialFetchDone.current = true; // Mark as done
        try {
          const response = await fetch('/api/user/me');
          if (response.ok) {
            const profile = await response.json();
            setUserProfile(profile);
            if (!profile.name) {
              setIsOnboardingOpen(true);
            }
          } else {
            console.error('Failed to fetch user profile');
          }

          // Perform the initial fetch for the chat list only
          const chatsResponse = await fetch('/api/chats');
          if (chatsResponse.ok) {
            const { chats } = await chatsResponse.json();
            setChats(chats);
          } else {
            console.error('Failed to fetch initial chats');
          }
        } catch (error) {
          console.error('Error during initial data fetch:', error);
        }
      }
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_OUT') {
        setUserProfile(null);
        setChats([]); // Clear chats on sign out
        initialFetchDone.current = false; // Reset for next login
        router.refresh();
      } else if (_event === 'SIGNED_IN') {
        // When a user signs in, we want to trigger the initial fetch again.
        initialFetchDone.current = false;
        getSessionAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const refreshChatList = async () => {
    try {
      // Fetch only the chat list, not the messages
      const response = await fetch('/api/chats');
      if (response.ok) {
        const { chats } = await response.json();
        setChats(chats);
      } else {
        console.error('Failed to refresh chats');
      }
    } catch (error) {
      console.error('Error refreshing chats:', error);
    }
  };

  const fetchCredits = async () => {
    try {
      setIsCreditsLoading(true);
      const response = await fetch('/api/user/credits');
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setIsCreditsLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      setIsRewardsLoading(true);
      const response = await fetch('/api/rewards');
      if (response.ok) {
        const data = await response.json();
        setRewardBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setIsRewardsLoading(false);
    }
  };

  // Fetch credits and rewards when session changes
  useEffect(() => {
    if (session) {
      fetchCredits();
      fetchRewards();
    }
  }, [session]);

  // Handle topup success redirect
  useEffect(() => {
    const topupStatus = searchParams.get('topup');
    if (topupStatus === 'success') {
      // Refresh credits after successful topup
      fetchCredits();
      // Clean up the URL
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleNameSaved = (name: string) => {
    if (userProfile) {
      setUserProfile({ ...userProfile, name });
    }
    setIsOnboardingOpen(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileAttach = (type: "image" | "video") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "image" ? "image/*" : "video/*";
    input.multiple = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        setAttachedFiles(prev => [...prev, ...Array.from(files)]);
      }
    };

    input.click();
  };

  const handleFetchFromAPI = () => {
    console.log("Fetch from API triggered");
  };

  const detectIntent = (message: string): 'text' | 'image_generation' | 'video' | 'unknown' => {
    const lowerCaseMessage = message.toLowerCase();
    const imageKeywords = ['generate image', 'create picture', 'draw'];
    const videoKeywords = ['generate video', 'create video', 'animate'];

    if (videoKeywords.some(kw => lowerCaseMessage.includes(kw))) {
      return 'video';
    }
    if (imageKeywords.some(kw => lowerCaseMessage.includes(kw))) {
      return 'image_generation';
    }
    return 'unknown'; // If no specific keyword, intent is unknown
  };

  const resizeAndLetterboxImage = (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetWidth = 1280;
        const targetHeight = 720;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Failed to get canvas context'));
        }

        // Fill the background with black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Calculate the best fit
        const hRatio = targetWidth / img.width;
        const vRatio = targetHeight / img.height;
        const ratio = Math.min(hRatio, vRatio);

        const centerShift_x = (targetWidth - img.width * ratio) / 2;
        const centerShift_y = (targetHeight - img.height * ratio) / 2;

        // Draw the image centered and scaled
        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          centerShift_x,
          centerShift_y,
          img.width * ratio,
          img.height * ratio
        );

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = base64;
    });
  };

  const handleSendMessage = async (overrideMessage?: string) => {
    const textToSend = overrideMessage ?? message;
    const trimmedMessage = textToSend.trim();

    if (trimmedMessage || attachedFiles.length > 0) {
      setIsLoading(true);
      // Ensure only the new message will have isNew=true
      setMessages(prev => prev.map(m => ({ ...m, isNew: false })));

      let fileBase64: string | undefined = undefined;
      let fileType: 'image' | 'video' | undefined = undefined;

      if (attachedFiles.length > 0) {
        const file = attachedFiles[0];
        const originalBase64 = await fileToBase64(file);
        if (file.type.startsWith('image/')) {
          fileType = 'image';
          // Resize the image before sending
          fileBase64 = await resizeAndLetterboxImage(originalBase64);
        } else if (file.type.startsWith('video/')) {
          fileType = 'video';
          fileBase64 = originalBase64; // Videos are sent as is
        }
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        text: trimmedMessage,
        image: fileType === 'image' ? fileBase64 : undefined,
        video: fileType === 'video' ? fileBase64 : undefined,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      setMessage("");
      setAttachedFiles([]);

      try {
        let response;
        let finalIntent = detectIntent(trimmedMessage);

        if (finalIntent === 'unknown') {
          // If local detection is unsure, ask the AI
          const intentResponse = await fetch('/api/detect-intent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: trimmedMessage }),
          });

          if (!intentResponse.ok) {
            throw new Error('Failed to detect intent from AI');
          }
          const intentData = await intentResponse.json();
          finalIntent = intentData.intent; // Update intent with AI's determination
        }

        console.log(`Routing to API based on intent: ${finalIntent}`);

        const body = {
          message: trimmedMessage,
          image: fileBase64,
          chatId,
          isTemporary: isTemporaryChat,
        };

        if (finalIntent === 'video') {
          response = await fetch('/api/video', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
        } else if (finalIntent === 'image_generation') { // Route to /api/chat for image generation
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...body, force_image: true }),
          });
        } else { // Default to text chat
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
        }

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log("API Response Data:", data); // DEBUG LOG

        if (!isTemporaryChat) {
          setChatId(data.chatId); // Update chatId from response
          refreshChatList(); // Refresh chat list after sending a message
        }
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          text: data.reply,
          image: data.imageUrl,
          video: data.videoUrl,
          suggestions: data.suggestions,
          timestamp: new Date(),
          isNew: true, // Mark as new for typing effect
        };
        console.log("Constructed AI Message:", aiMessage); // DEBUG LOG
        setMessages(prev => [...prev, aiMessage]);

      } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          text: "Sorry, I couldn't connect to the server. Please try again later.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNewChat = () => {
    setChatId(null);
    setMessages([]);
    setIsTemporaryChat(false);
    setActiveView('chat'); // Switch back to chat view
  };

  const handleSelectChat = async (selectedChatId: string) => {
    setChatId(selectedChatId);
    setIsTemporaryChat(false); // Ensure temporary mode is off when selecting a historical chat
    setActiveView('chat'); // Switch back to chat view
    // Fetch messages for the selected chat
    try {
      console.log(`Fetching messages for chat ID: ${selectedChatId}`); // DEBUG LOG
      const response = await fetch(`/api/messages?chatId=${selectedChatId}`);
      if (response.ok) {
        const chatMessages = await response.json();
        console.log("Fetched Messages:", chatMessages); // DEBUG LOG
        setMessages(chatMessages.map((msg: any) => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'ai',
          text: msg.content,
          image: msg.attachments?.find((a: any) => a.type.startsWith('image/'))?.url,
          video: msg.attachments?.find((a: any) => a.type.startsWith('video/'))?.url,
          timestamp: new Date(msg.createdAt),
        })));
      } else {
        console.error('Failed to fetch messages for the selected chat');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleUsePrompt = (prompt: string) => {
    setMessage(prompt);
    setActiveView('chat');
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onNameSaved={handleNameSaved}
      />
      <TopupSheet
        isOpen={isTopupOpen}
        onClose={() => setIsTopupOpen(false)}
        currentCredits={credits}
      />
      <ReferralSheet
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
        rewardBalance={rewardBalance}
      />
      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 h-full w-64 border-r border-gray-200/50 bg-white/60 backdrop-blur-xl flex flex-col transition-transform duration-300 ease-in-out z-60 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {/* Logo/Brand with Close Button */}
          <div className="mb-6 px-2 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Naikkelas
              </h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cognition & Connection</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="h-6 w-6 hover:bg-purple-50 md:hidden"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="h-6 w-6 hover:bg-purple-50 hidden md:block"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-0.5">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 group h-9 text-xs"
              onClick={handleNewChat}
            >
              <MessageSquarePlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">New Chat</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 group h-9 text-xs"
              onClick={() => {
                handleNewChat();
                setIsTemporaryChat(true);
              }}
            >
              <MessageSquareOff className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Temporary Chat</span>
            </Button>
            {navItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className={`w-full justify-start gap-2 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 group h-9 text-xs ${activeView === item.label.toLowerCase() ? 'bg-purple-50 text-purple-700' : ''
                  }`}
                onClick={() => {
                  if (item.label === 'Explore') {
                    setActiveView('explore');
                  } else if (item.label === 'Library') {
                    setActiveView('library');
                  }
                }}
              >
                <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="font-medium">{item.label}</span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 group h-9 text-xs"
              onClick={() => setIsHistoryVisible(!isHistoryVisible)}
            >
              <Clock className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Chat History</span>
            </Button>
            {isHistoryVisible && <ChatHistoryList chats={chats} onSelectChat={handleSelectChat} activeChatId={chatId} />}
          </nav>
        </div>

        {/* Credits & Rewards Display */}
        {session && (
          <div className="px-3 pb-2 space-y-2">
            <CreditsDisplay
              credits={credits}
              isLoading={isCreditsLoading}
              onTopupClick={() => setIsTopupOpen(true)}
            />
            <RewardsDisplay
              balance={rewardBalance}
              isLoading={isRewardsLoading}
              onClick={() => setIsReferralOpen(true)}
            />
          </div>
        )}

        {/* User Profile Section */}
        <div className="p-3 pb-8 border-t border-gray-200/50 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-purple-50/50 transition-all duration-200 cursor-pointer group">
                <Avatar className="w-8 h-8 ring-2 ring-purple-200/50 group-hover:ring-purple-300 transition-all">
                  <AvatarImage src={session?.user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400 text-white text-xs">
                    {userProfile?.name?.charAt(0).toUpperCase() ?? session?.user?.email?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {userProfile?.name ?? 'User'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {session?.user?.email ?? 'No session'}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={24}
              className="w-56 rounded-xl border-gray-200/50 shadow-lg bg-white/60 backdrop-blur-xl z-[100]">
              <DropdownMenuItem disabled className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsTopupOpen(true)} className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Top Up Credits
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-red-500 focus:bg-red-50 focus:text-red-600">
                <LogOut className="w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex h-full flex-1 flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'ml-0'
        }`}>
        {isTemporaryChat && (
          <div className={`fixed top-0 left-0 right-0 z-50 flex h-8 w-full items-center overflow-x-hidden bg-purple-500/10 border-b border-purple-200/50 backdrop-blur-sm transition-all duration-300 ${isSidebarOpen ? 'md:left-64' : ''}`}>
            <div className="animate-marquee flex min-w-full shrink-0 items-center justify-around">
              <span className="text-xs font-medium text-purple-700">Temporary Mode</span>
              <span className="text-xs font-medium text-purple-700">Temporary Mode</span>
              <span className="text-xs font-medium text-purple-700">Temporary Mode</span>
            </div>
            <div className="animate-marquee flex min-w-full shrink-0 items-center justify-around" aria-hidden="true">
              <span className="text-xs font-medium text-purple-700">Temporary Mode</span>
              <span className="text-xs font-medium text-purple-700">Temporary Mode</span>
              <span className="text-xs font-medium text-purple-700">Temporary Mode</span>
            </div>
          </div>
        )}
        {/* Desktop Toggle Button (when sidebar is closed) */}
        {!isSidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-3 left-3 z-30 h-8 w-8 rounded-xl bg-white/80 backdrop-blur-xl border border-gray-200/50 hover:bg-purple-50 shadow-md hidden md:flex"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </Button>
        )}

        {/* Mobile Header */}
        <header className={`md:hidden fixed left-0 right-0 z-40 flex items-center justify-between p-3 h-14 bg-white/60 backdrop-blur-xl border-b border-gray-200/50 ${isTemporaryChat ? 'top-8' : 'top-0'}`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="h-8 w-8 rounded-xl"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Naikkelas
          </h1>
          <div className="w-8"></div> {/* Spacer */}
        </header>

        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-55 md:hidden"
          ></div>
        )}

        <div className={`flex-1 flex flex-col items-center w-full px-4 sm:px-6 ${!isSidebarOpen ? 'pt-[56px] md:pt-0' : ''} ${isTemporaryChat ? 'pt-8 md:pt-8' : ''} ${isTemporaryChat && !isSidebarOpen ? 'md:pt-0' : ''} ${isTemporaryChat && !isSidebarOpen ? 'pt-[calc(56px+32px)]' : ''} ${activeView === 'explore' || activeView === 'library' ? 'h-full overflow-y-auto py-6' : ''}`}>
          {activeView === 'explore' ? (
            <PromptBuilder className="w-full max-w-6xl" onUsePrompt={handleUsePrompt} />
          ) : activeView === 'library' ? (
            <MediaLibrary onNavigateToChat={handleSelectChat} />
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-2 w-full">
              {/* Greeting Section */}
              <div className="text-center space-y-2 animate-fade-in">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-snug mb-4">
                  Hello, {userProfile?.name ?? 'there'}
                  <br />
                  How Can <span className="bg-gradient-to-t from-purple-600 to-blue-500 bg-clip-text text-transparent">I Assist You?</span>
                </h2>
              </div>

              {/* Chat Input Section - MOVED UP */}
              <div className="w-full max-w-2xl pt-4">
                <ChatInput
                  message={message}
                  setMessage={setMessage}
                  attachedFiles={attachedFiles}
                  setAttachedFiles={setAttachedFiles}
                  handleSendMessage={handleSendMessage}
                  handleFileAttach={handleFileAttach}
                  handleFetchFromAPI={handleFetchFromAPI}
                  onOpenPromptBuilder={() => setActiveView('explore')}
                  isConversationActive={messages.length > 0}
                />
              </div>

              {/* Suggested Prompts - MOVED DOWN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl pt-3">
                {[
                  "Generate a creative story",
                  "Analyze this image",
                  "Help me write code",
                  "Explain a complex topic"
                ].map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setMessage(prompt)}
                    className="p-3 rounded-xl bg-white/40 backdrop-blur-sm border border-gray-200/50 hover:bg-white/60 hover:border-purple-200 text-left text-xs text-muted-foreground hover:text-foreground transition-all duration-200 floating-hover"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col w-full items-center min-h-0">
              {/* Chat Messages Area */}
              <div className="flex-1 w-full max-w-3xl space-y-6 py-6 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    {msg.type === "user" ? (
                      <div className="flex flex-col items-end gap-2">
                        {msg.image && (
                          <ChatImage
                            src={msg.image}
                            alt="User attachment"
                            className="rounded-lg w-3/5"
                          />
                        )}
                        {msg.video && (
                          <video
                            src={msg.video}
                            controls
                            className="rounded-lg w-1/2"
                          />
                        )}
                        <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-white dark:bg-card border border-gray-200/60 dark:border-gray-700/50 text-foreground shadow-sm relative overflow-hidden flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-blue-50/20 dark:from-purple-900/10 dark:to-blue-900/10 pointer-events-none" />
                          <div className="text-sm sm:text-[14px] leading-normal relative z-10 whitespace-pre-wrap break-words">
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-full">
                        <div className="text-sm leading-relaxed text-foreground mb-2">
                          {msg.isNew ? (
                            <TypingMessage
                              content={msg.text}
                              onComplete={() => markMessageAsOld(msg.id)}
                            />
                          ) : (
                            <MarkdownRenderer content={msg.text} className="prose-base sm:text-[17px]" />
                          )}
                        </div>
                        {msg.image && (
                          <ChatImage
                            src={msg.image}
                            alt="AI generated image"
                            className="rounded-lg w-3/5"
                          />
                        )}
                        {msg.video && (
                          <video
                            src={msg.video}
                            controls
                            className="rounded-lg w-3/5"
                          />
                        )}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3 animate-fade-in">
                            {msg.suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => setMessage(suggestion)}
                                className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="max-w-full">
                      <div className="text-sm font-medium text-purple-600 animate-pulse italic">
                        {loadingMessage}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Section - For Active Chat */}
              <div className="sticky bottom-0 z-10 w-full bg-background pt-4">
                <div className="w-full max-w-2xl mx-auto pb-4">
                  <ChatInput
                    message={message}
                    setMessage={setMessage}
                    attachedFiles={attachedFiles}
                    setAttachedFiles={setAttachedFiles}
                    handleSendMessage={handleSendMessage}
                    handleFileAttach={handleFileAttach}
                    handleFetchFromAPI={handleFetchFromAPI}
                    onOpenPromptBuilder={() => setActiveView('explore')}
                    isConversationActive={messages.length > 0}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
