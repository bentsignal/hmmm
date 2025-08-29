"use client";

import { useMemo, useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PersonalInfoForm({
  initial,
}: {
  initial: {
    name?: string;
    location?: string;
    language?: string;
    notes?: string;
  };
}) {
  const [name, setName] = useState(initial?.name);
  const [location, setLocation] = useState(initial?.location);
  const [language, setLanguage] = useState(initial?.language);
  const [notes, setNotes] = useState(initial?.notes);

  const [lastSavedName, setLastSavedName] = useState(initial?.name);
  const [lastSavedLocation, setLastSavedLocation] = useState(initial?.location);
  const [lastSavedLanguage, setLastSavedLanguage] = useState(initial?.language);
  const [lastSavedNotes, setLastSavedNotes] = useState(initial?.notes);

  const { mutate: save } = useMutation({
    mutationFn: useConvexMutation(api.user.info.update),
    onSuccess: () => {
      toast.success("Info updated");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to update info");
    },
  });

  // disable button if no changes have been made
  const disabled = useMemo(() => {
    if (
      name === lastSavedName &&
      location === lastSavedLocation &&
      language === lastSavedLanguage &&
      notes === lastSavedNotes
    ) {
      return true;
    }
    return false;
  }, [
    name,
    location,
    language,
    notes,
    lastSavedName,
    lastSavedLocation,
    lastSavedLanguage,
    lastSavedNotes,
  ]);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        save({
          name: name?.trim() || undefined,
          location: location?.trim() || undefined,
          language: language?.trim() || undefined,
          notes: notes?.trim() || undefined,
        });
        setLastSavedName(name);
        setLastSavedLocation(location);
        setLastSavedLanguage(language);
        setLastSavedNotes(notes);
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
