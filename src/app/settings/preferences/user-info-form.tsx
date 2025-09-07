"use client";

import { useMemo, useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { PublicLanguageModel } from "@/convex/ai/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserInfo = {
  name?: string;
  location?: string;
  language?: string;
  notes?: string;
  model?: string;
};

export default function UserInfoForm({
  userInfo,
  showModelSelector,
  models,
}: {
  userInfo: UserInfo | null;
  showModelSelector: boolean;
  models: Record<string, PublicLanguageModel>;
}) {
  const { mutate: save } = useMutation({
    mutationFn: useConvexMutation(api.user.info.update),
    onSuccess: () => {
      toast.success("Preferences updated");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to update preferences");
    },
  });

  const [name, setName] = useState(userInfo?.name);
  const [location, setLocation] = useState(userInfo?.location);
  const [language, setLanguage] = useState(userInfo?.language);
  const [notes, setNotes] = useState(userInfo?.notes);
  const [model, setModel] = useState(userInfo?.model);

  // disable save button if no changes have been made since last save
  const [lastSavedUserInfo, setLastSavedUserInfo] = useState<UserInfo | null>(
    userInfo,
  );
  const disabled = useMemo(() => {
    if (!lastSavedUserInfo) {
      return false;
    }
    if (
      name === lastSavedUserInfo?.name &&
      location === lastSavedUserInfo?.location &&
      language === lastSavedUserInfo?.language &&
      notes === lastSavedUserInfo?.notes &&
      (showModelSelector ? model === lastSavedUserInfo?.model : true)
    ) {
      return true;
    }
    return false;
  }, [name, location, language, notes, model, lastSavedUserInfo]);

  const groupedModels = useMemo(() => {
    const providerToModels = new Map<
      string,
      Array<[string, PublicLanguageModel]>
    >();
    for (const [modelId, modelData] of Object.entries(models)) {
      const arr = providerToModels.get(modelData.provider) ?? [];
      arr.push([modelId, modelData]);
      providerToModels.set(modelData.provider, arr);
    }
    const sortedProviders = Array.from(providerToModels.keys()).sort((a, b) =>
      a.localeCompare(b),
    );
    return sortedProviders.map((provider) => {
      const items = (providerToModels.get(provider) ?? []).sort((a, b) =>
        a[1].name.localeCompare(b[1].name),
      );
      return { provider, items } as const;
    });
  }, [models]);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        save({
          name: name?.trim(),
          location: location?.trim(),
          language: language?.trim(),
          notes: notes?.trim(),
          model: showModelSelector ? model : undefined,
        });
        setLastSavedUserInfo({
          name: name?.trim(),
          location: location?.trim(),
          language: language?.trim(),
          notes: notes?.trim(),
          model: showModelSelector ? model : undefined,
        });
      }}
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium">What should we call you?</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={100}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Where are you from?</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter your location"
          maxLength={100}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">
          What language should we respond in?
        </label>
        <Input
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="English, Spanish, etc."
          maxLength={100}
        />
      </div>
      {showModelSelector && (
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            What model do you want to use?
          </label>
          <Select value={model} onValueChange={(value) => setModel(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {groupedModels.map(({ provider, items }) => (
                <SelectGroup key={provider} className="mb-2">
                  <SelectLabel>{provider}</SelectLabel>
                  {items.map(([modelId, modelData]) => (
                    <SelectItem key={modelId} value={modelId}>
                      {modelData.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Anything else we should know about you?
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interests, values, or anything else you'd like to tell us"
          rows={4}
          className="bg-input/30 border-border rounded-lg border-1 p-2"
          maxLength={1000}
        />
      </div>
      <div>
        <Button type="submit" disabled={disabled}>
          Save
        </Button>
      </div>
    </form>
  );
}
