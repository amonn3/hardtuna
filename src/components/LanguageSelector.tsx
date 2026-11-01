import { type Language, type Messages } from '../i18n';

export function LanguageSelector({ language, onChange, text }: {
  language: Language;
  onChange: (language: Language) => void;
  text: Messages;
}) {
  return (
    <label className="language-selector">
      {text.language}
      <select value={language} onChange={event => onChange(event.target.value as Language)}>
        <option value="en" lang="en">English</option>
        <option value="pt-BR" lang="pt-BR">Português</option>
      </select>
    </label>
  );
}
