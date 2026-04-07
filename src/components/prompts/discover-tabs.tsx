"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { 
  ArrowRight, 
  Clock, 
  Flame, 
  RefreshCw, 
  Star, 
  Users,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Masonry } from "@/components/ui/masonry";
import { PromptCard } from "@/components/prompts/prompt-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Prompt {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    avatar: string | null;
    verified: boolean;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
  contributors: Array<{
    id: string;
    username: string;
    name: string | null;
    avatar: string | null;
  }>;
  _count: {
    votes: number;
    contributors: number;
    outgoingConnections: number;
    incomingConnections: number;
  };
  voteCount: number;
  contributorCount: number;
  slug: string | null;
}

interface DiscoverTabsProps {
  featuredPrompts: Prompt[];
  todaysMostUpvoted: Prompt[];
  latestPrompts: Prompt[];
  recentlyUpdated: Prompt[];
  mostContributed: Prompt[];
  allUsernames: string[];
  adminUsernames: string[];
  isAdmin?: boolean;
}

export function DiscoverTabs({
  featuredPrompts,
  todaysMostUpvoted,
  latestPrompts,
  recentlyUpdated,
  mostContributed,
  allUsernames,
  adminUsernames,
  isAdmin = false,
}: DiscoverTabsProps) {
  const t = useTranslations("feed");
  const tDiscovery = useTranslations("discovery");
  const tCommon = useTranslations("common");
  const tPrompts = useTranslations("prompts");

  const [activeTab, setActiveTab] = useState("featured");
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("votes"); // votes, date, updated
  const [filterType, setFilterType] = useState("all"); // all, text, image, video, skill, taste
  const [filterAge, setFilterAge] = useState("all"); // all, day, week, month, year
  const [filterUsername, setFilterUsername] = useState("");
  const [filterVersions, setFilterVersions] = useState("all"); // all, 1, 2+, 5+
  const [showAdminOnly, setShowAdminOnly] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const LIMIT = 25;

  // Username search autocomplete
  useEffect(() => {
    if (filterUsername.length >= 1) {
      const matches = allUsernames
        .filter(u => u.toLowerCase().includes(filterUsername.toLowerCase()))
        .slice(0, 10);
      setUsernameSuggestions(matches);
    } else {
      setUsernameSuggestions([]);
    }
  }, [filterUsername, allUsernames]);

  // Filter and sort prompts
  const filterAndSort = (prompts: Prompt[]) => {
    let filtered = [...prompts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter(p => p.type.toLowerCase() === filterType.toLowerCase());
    }

    // Age filter
    if (filterAge !== "all") {
      const now = new Date().getTime();
      const ageMs = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      }[filterAge] || 0;
      
      filtered = filtered.filter(p => 
        now - new Date(p.createdAt).getTime() <= ageMs
      );
    }

    // Username filter
    if (filterUsername) {
      filtered = filtered.filter(p =>
        p.author.username.toLowerCase().includes(filterUsername.toLowerCase())
      );
    }

    // Version count filter
    if (filterVersions !== "all") {
      if (filterVersions === "1") {
        filtered = filtered.filter(p => p.contributorCount === 0);
      } else if (filterVersions === "2+") {
        filtered = filtered.filter(p => p.contributorCount >= 1);
      } else if (filterVersions === "5+") {
        filtered = filtered.filter(p => p.contributorCount >= 4);
      }
    }

    // Admin only filter
    if (showAdminOnly && adminUsernames.length > 0) {
      filtered = filtered.filter(p => adminUsernames.includes(p.author.username));
    }

    // Sort
    if (sortBy === "votes") {
      filtered.sort((a, b) => b.voteCount - a.voteCount);
    } else if (sortBy === "date") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "updated") {
      filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return filtered.slice(0, LIMIT);
  };

  const filteredFeatured = useMemo(() => filterAndSort(featuredPrompts), [
    featuredPrompts, searchQuery, sortBy, filterType, filterAge, filterUsername, filterVersions, showAdminOnly, adminUsernames
  ]);

  const filteredMostContributed = useMemo(() => filterAndSort(mostContributed), [
    mostContributed, searchQuery, sortBy, filterType, filterAge, filterUsername, filterVersions, showAdminOnly, adminUsernames
  ]);

  const filteredRecentlyUpdated = useMemo(() => filterAndSort(recentlyUpdated), [
    recentlyUpdated, searchQuery, sortBy, filterType, filterAge, filterUsername, filterVersions, showAdminOnly, adminUsernames
  ]);

  const filteredLatest = useMemo(() => filterAndSort(latestPrompts), [
    latestPrompts, searchQuery, sortBy, filterType, filterAge, filterUsername, filterVersions, showAdminOnly, adminUsernames
  ]);

  const hasActiveFilters = searchQuery || sortBy !== "votes" || filterType !== "all" || 
    filterAge !== "all" || filterUsername || filterVersions !== "all" || showAdminOnly;

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("votes");
    setFilterType("all");
    setFilterAge("all");
    setFilterUsername("");
    setFilterVersions("all");
    setShowAdminOnly(false);
  };

  return (
    <div className="container py-6">
      {/* Filter Panel */}
      <div className="mb-6 p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold">{tCommon("filter")}</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" />
              {tCommon("reset")}
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs">{tCommon("search")}</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <Label htmlFor="sort" className="text-xs">{tCommon("sort")}</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="votes">Most Votes</SelectItem>
                <SelectItem value="date">Newest First</SelectItem>
                <SelectItem value="updated">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-xs">Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger id="type" className="h-9">
                <SelectValue />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon("all")}</SelectItem>
                  <SelectItem value="text">{tPrompts("types.text")}</SelectItem>
                  <SelectItem value="image">{tPrompts("types.image")}</SelectItem>
                  <SelectItem value="video">{tPrompts("types.video")}</SelectItem>
                  <SelectItem value="skill">{tPrompts("types.skill")}</SelectItem>
                  <SelectItem value="taste">{tPrompts("types.taste")}</SelectItem>
                </SelectContent>
            </Select>
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age" className="text-xs">Age</Label>
            <Select value={filterAge} onValueChange={setFilterAge}>
              <SelectTrigger id="age" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCommon("all")}</SelectItem>
                <SelectItem value="day">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-xs">Username</Label>
            <Popover open={usernameSuggestions.length > 0 && filterUsername.length >= 1}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder="Filter by username..."
                    value={filterUsername}
                    onChange={(e) => setFilterUsername(e.target.value)}
                    className="h-9"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <div className="max-h-[200px] overflow-auto">
                  {usernameSuggestions.map((username) => (
                    <button
                      key={username}
                      onClick={() => {
                        setFilterUsername(username);
                        setUsernameSuggestions([]);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-accent"
                    >
                      {username}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Versions */}
          <div className="space-y-2">
            <Label htmlFor="versions" className="text-xs">Versions</Label>
            <Select value={filterVersions} onValueChange={setFilterVersions}>
              <SelectTrigger id="versions" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCommon("all")}</SelectItem>
                <SelectItem value="1">1 Version</SelectItem>
                <SelectItem value="2+">2+ Versions</SelectItem>
                <SelectItem value="5+">5+ Versions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Admin Only Toggle */}
        {adminUsernames.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <Switch
              id="admin-only"
              checked={showAdminOnly}
              onCheckedChange={setShowAdminOnly}
            />
            <Label htmlFor="admin-only" className="text-sm cursor-pointer">
              {showAdminOnly ? "Solution8 Only" : "All Users"}
            </Label>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="featured">
            <Star className="h-4 w-4 mr-1.5" />
            Featured
          </TabsTrigger>
          <TabsTrigger value="contributed">
            <Users className="h-4 w-4 mr-1.5" />
            Most Contributed
          </TabsTrigger>
          <TabsTrigger value="updated">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Recently Updated
          </TabsTrigger>
          <TabsTrigger value="latest">
            <Clock className="h-4 w-4 mr-1.5" />
            Latest
          </TabsTrigger>
        </TabsList>

        {/* Featured Tab */}
        <TabsContent value="featured">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <h2 className="text-xl font-semibold">{tDiscovery("featuredPrompts")}</h2>
              <Badge variant="secondary" className="text-xs">
                Top {filteredFeatured.length} of {LIMIT}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/prompts" prefetch={false}>
                {t("browseAll")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {filteredFeatured.length > 0 ? (
            <Masonry columnCount={{ default: 1, md: 2, lg: 3 }} gap={16}>
              {filteredFeatured.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} isAdmin={isAdmin} />
              ))}
            </Masonry>
          ) : (
            <p className="text-center text-muted-foreground py-8">No prompts match your filters</p>
          )}
        </TabsContent>

        {/* Most Contributed Tab */}
        <TabsContent value="contributed">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <h2 className="text-xl font-semibold">{tDiscovery("mostContributed")}</h2>
              <Badge variant="secondary" className="text-xs">
                Top {filteredMostContributed.length} of {LIMIT}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/prompts" prefetch={false}>
                {t("browseAll")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {filteredMostContributed.length > 0 ? (
            <Masonry columnCount={{ default: 1, md: 2, lg: 3 }} gap={16}>
              {filteredMostContributed.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} isAdmin={isAdmin} />
              ))}
            </Masonry>
          ) : (
            <p className="text-center text-muted-foreground py-8">No prompts match your filters</p>
          )}
        </TabsContent>

        {/* Recently Updated Tab */}
        <TabsContent value="updated">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-semibold">{tDiscovery("recentlyUpdated")}</h2>
              <Badge variant="secondary" className="text-xs">
                Top {filteredRecentlyUpdated.length} of {LIMIT}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/prompts" prefetch={false}>
                {t("browseAll")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {filteredRecentlyUpdated.length > 0 ? (
            <Masonry columnCount={{ default: 1, md: 2, lg: 3 }} gap={16}>
              {filteredRecentlyUpdated.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} isAdmin={isAdmin} />
              ))}
            </Masonry>
          ) : (
            <p className="text-center text-muted-foreground py-8">No prompts match your filters</p>
          )}
        </TabsContent>

        {/* Latest Tab */}
        <TabsContent value="latest">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">{tDiscovery("latestPrompts")}</h2>
              <Badge variant="secondary" className="text-xs">
                Top {filteredLatest.length} of {LIMIT}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/prompts" prefetch={false}>
                {t("browseAll")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {filteredLatest.length > 0 ? (
            <Masonry columnCount={{ default: 1, md: 2, lg: 3 }} gap={16}>
              {filteredLatest.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} isAdmin={isAdmin} />
              ))}
            </Masonry>
          ) : (
            <p className="text-center text-muted-foreground py-8">No prompts match your filters</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
