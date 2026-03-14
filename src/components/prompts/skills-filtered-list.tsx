"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { 
  Search,
  X,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

interface Skill {
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

interface SkillsFilteredListProps {
  skills: Skill[];
  allUsernames: string[];
  adminUsernames: string[];
}

export function SkillsFilteredList({
  skills,
  allUsernames,
  adminUsernames,
}: SkillsFilteredListProps) {
  const tCommon = useTranslations("common");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("votes"); // votes, date, updated
  const [filterAge, setFilterAge] = useState("all"); // all, day, week, month, year
  const [filterUsername, setFilterUsername] = useState("");
  const [filterVersions, setFilterVersions] = useState("all"); // all, 1, 2+, 5+
  const [showAdminOnly, setShowAdminOnly] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

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

  // Filter and sort skills
  const filteredSkills = useMemo(() => {
    let filtered = [...skills];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    // Age filter
    if (filterAge !== "all") {
      const now = Date.now();
      const ageMs = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      }[filterAge] || 0;
      
      filtered = filtered.filter(s => 
        now - new Date(s.createdAt).getTime() <= ageMs
      );
    }

    // Username filter
    if (filterUsername) {
      filtered = filtered.filter(s =>
        s.author.username.toLowerCase().includes(filterUsername.toLowerCase())
      );
    }

    // Version count filter
    if (filterVersions !== "all") {
      if (filterVersions === "1") {
        filtered = filtered.filter(s => s.contributorCount === 0);
      } else if (filterVersions === "2+") {
        filtered = filtered.filter(s => s.contributorCount >= 1);
      } else if (filterVersions === "5+") {
        filtered = filtered.filter(s => s.contributorCount >= 4);
      }
    }

    // Admin only filter
    if (showAdminOnly && adminUsernames.length > 0) {
      filtered = filtered.filter(s => adminUsernames.includes(s.author.username));
    }

    // Sort
    if (sortBy === "votes") {
      filtered.sort((a, b) => b.voteCount - a.voteCount);
    } else if (sortBy === "date") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "updated") {
      filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return filtered;
  }, [skills, searchQuery, sortBy, filterAge, filterUsername, filterVersions, showAdminOnly, adminUsernames]);

  const hasActiveFilters = searchQuery || sortBy !== "votes" || 
    filterAge !== "all" || filterUsername || filterVersions !== "all" || showAdminOnly;

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("votes");
    setFilterAge("all");
    setFilterUsername("");
    setFilterVersions("all");
    setShowAdminOnly(false);
  };

  return (
    <>
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
                placeholder="Search skills..."
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

      {/* Skills List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.length > 0 ? (
          filteredSkills.map((skill) => (
            <PromptCard key={skill.id} prompt={skill} />
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No skills match your filters
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center mt-4">
        Showing {filteredSkills.length} of {skills.length} skills
      </p>
    </>
  );
}
