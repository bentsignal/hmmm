import DefaultLoading from "@/components/default-loading";

// this is used on each settings sub page
export const SettingsPageLoading = () => {
  return (
    <div className="flex h-20 w-full">
      <DefaultLoading />
    </div>
  );
};

// this is the global loading state for all settings pages
export { default } from "@/components/default-loading";
