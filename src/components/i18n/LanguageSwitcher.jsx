import { useLanguage } from "../../i18n/LanguageContext";

export default function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage, languages, t } = useLanguage();

  return (
    <label className={`language-switcher ${className}`}>
      <span>{t("common.language")}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value)}>
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
