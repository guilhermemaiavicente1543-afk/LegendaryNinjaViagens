import { useMemo } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import CustomSelect from "../ui/CustomSelect";

const LANGUAGE_META = {
  pt: {
    icon: "BR",
    description: "Português"
  },
  en: {
    icon: "EN",
    description: "English"
  },
  es: {
    icon: "ES",
    description: "Español"
  },
  fr: {
    icon: "FR",
    description: "Français"
  }
};

export default function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage, languages, t } = useLanguage();

  const options = useMemo(() => {
    return languages.map((item) => ({
      value: item.code,
      label: item.label,
      icon: LANGUAGE_META[item.code]?.icon || item.label,
      description: LANGUAGE_META[item.code]?.description || item.label
    }));
  }, [languages]);

  return (
    <CustomSelect
      label={t("common.language")}
      value={language}
      options={options}
      onChange={setLanguage}
      className={`language-switcher ${className}`}
      align="right"
    />
  );
}
