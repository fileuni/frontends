import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Extension, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CodeMirrorEditor } from "@/components/editors/CodeMirrorEditor";
import { normalizeFrontendStoredLocale } from "@/i18n/locale-adapter";
import { toTraditionalChineseString } from "@/i18n/core";
import { cn } from "@/lib/utils";

export interface ConfigNoteEntry {
  desc_en: string;
  desc_zh: string;
  example: string;
}

export interface ConfigError {
  line: number;
  column: number;
  message: string;
  key?: string | null | undefined;
}

export interface EditorJumpPosition {
  line: number;
  column?: number | undefined;
}

interface ConfigRawEditorProps {
  content: string;
  onChange: (value: string) => void;
  embeddedTemplate?: string | undefined;
  notes: Record<string, ConfigNoteEntry>;
  errors?: ConfigError[] | undefined;
  jumpTo?: EditorJumpPosition | null | undefined;
  height?: string | undefined;
  activePath?: string;
  hideNotes?: boolean;
  isDark?: boolean;
}

const findLineByPath = (content: string, path: string): number => {
  if (!path) return 1;
  const lines = content.split(/\r?\n/);
  const parts = path.split(".");
  const key = parts.pop() || "";
  const sectionName = parts.join(".");

  let startLine = 0;
  let endLine = lines.length;

  if (sectionName) {
    const sectionTarget = `[${sectionName}]`;
    const sectionTargetArray = `[[${sectionName}]]`;
    for (let i = 0; i < lines.length; i += 1) {
      const trimmed = (lines[i] ?? "").trim();
      if (trimmed === sectionTarget || trimmed === sectionTargetArray) {
        startLine = i;
        for (let j = i + 1; j < lines.length; j += 1) {
          if ((lines[j] ?? "").trim().startsWith("[")) {
            endLine = j;
            break;
          }
        }
        break;
      }
    }
  }

  const keyRegex = new RegExp(`^\\s*${key}\\s*=`);
  for (let i = startLine; i < endLine; i += 1) {
    if (keyRegex.test(lines[i] ?? "")) {
      return i + 1;
    }
  }

  return startLine > 0 ? startLine + 1 : 1;
};

const resolveActivePathFromDoc = (doc: Text, lineNumber: number): string => {
  if (lineNumber <= 0 || lineNumber > doc.lines) return "";

  let currentSection = "";
  for (let i = lineNumber; i >= 1; i -= 1) {
    const line = doc.line(i).text.trim();
    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.replace(/[\[\]]/g, "");
      break;
    }
  }

  const currentLine = doc.line(lineNumber).text.trim();
  const match = currentLine.match(/^([a-zA-Z0-9_-]+)\s*=/);
  if (match && match[1]) {
    return currentSection ? `${currentSection}.${match[1]}` : match[1];
  }

  return currentSection;
};

const getLocalizedNote = (note: ConfigNoteEntry, lang: string) => {
  const resolvedLocale = normalizeFrontendStoredLocale(lang) ?? "en";
  const isEn = resolvedLocale === "en";
  return {
    title:
      resolvedLocale === "zh-Hant"
        ? "設定詳情"
        : isEn
          ? "Configuration Detail"
          : "配置详情",
    description:
      resolvedLocale === "zh-Hant"
        ? toTraditionalChineseString(note.desc_zh)
        : isEn
          ? note.desc_en
          : note.desc_zh,
  };
};

export const ConfigRawEditor: React.FC<ConfigRawEditorProps> = ({
  content,
  onChange,
  embeddedTemplate,
  notes,
  jumpTo,
  height = "600px",
  activePath: externalActivePath,
  hideNotes = false,
  isDark = true,
}) => {
  const { t, i18n } = useTranslation();
  const editorRef = useRef<EditorView | null>(null);
  const [internalActivePath, setInternalActivePath] = useState("");
  const resolvedHeight =
    height === "100%" ? "clamp(360px, 62vh, 900px)" : height;
  const activePath = externalActivePath || internalActivePath;

  const activeNote = useMemo(() => {
    if (!activePath) return null;
    if (notes[activePath]) return notes[activePath];
    const parts = activePath.split(".");
    while (parts.length > 1) {
      parts.pop();
      const key = parts.join(".");
      if (notes[key]) return notes[key];
    }
    return null;
  }, [activePath, notes]);

  const moveCodeMirrorSelection = useCallback(
    (line: number, column = 1, focus = false) => {
      const view = editorRef.current;
      if (!view) return;
      const safeLine = Math.min(Math.max(1, line), view.state.doc.lines);
      const targetLine = view.state.doc.line(safeLine);
      const safeColumn = Math.min(Math.max(1, column), targetLine.length + 1);
      const anchor = targetLine.from + safeColumn - 1;
      view.dispatch({
        selection: { anchor, head: targetLine.to },
        effects: EditorView.scrollIntoView(anchor, { y: "center" }),
      });
      if (focus) {
        view.focus();
      }
    },
    [],
  );

  const editorExtensions = useMemo<Extension[]>(
    () => [
      EditorView.updateListener.of((update) => {
        if (!update.docChanged && !update.selectionSet) {
          return;
        }
        const line = update.state.doc.lineAt(
          update.state.selection.main.head,
        ).number;
        setInternalActivePath(resolveActivePathFromDoc(update.state.doc, line));
      }),
    ],
    [],
  );

  useEffect(() => {
    if (!externalActivePath) return;
    const targetLine = findLineByPath(content, externalActivePath);
    moveCodeMirrorSelection(targetLine, 1, false);
  }, [content, externalActivePath, moveCodeMirrorSelection]);

  useEffect(() => {
    if (!jumpTo || jumpTo.line <= 0) {
      return;
    }
    const column =
      typeof jumpTo.column === "number" && jumpTo.column > 0
        ? jumpTo.column
        : 1;
    moveCodeMirrorSelection(jumpTo.line, column, true);
  }, [jumpTo, moveCodeMirrorSelection]);

  return (
    <div
      className="flex flex-col w-full gap-3 sm:gap-4"
      style={{ height: resolvedHeight, minHeight: "360px" }}
    >
      <div className="flex flex-col shrink-0 gap-3 sm:gap-4">
        {!hideNotes && (
          <div
            className={cn(
              "rounded-xl sm:rounded-2xl border p-3 sm:p-4 flex flex-col gap-3 shadow-sm",
              isDark
                ? "border-white/5 bg-white/[0.02]"
                : "border-slate-200 bg-slate-50",
            )}
          >
            {activeNote ? (
              (() => {
                const localized = getLocalizedNote(activeNote, i18n.language);
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="text-sm sm:text-sm font-black uppercase text-primary leading-none mb-1">
                        {localized.title}
                      </div>
                      <div
                        className={cn(
                          "text-sm sm:text-sm leading-relaxed break-words whitespace-normal font-bold",
                          isDark ? "text-white/90" : "text-slate-800",
                        )}
                      >
                        {localized.description}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
                      {activeNote.example !== "{SECTION}" &&
                        activeNote.example !== "" && (
                          <div
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0",
                              isDark
                                ? "bg-black/40 border-white/5"
                                : "bg-white border-slate-200",
                            )}
                          >
                            <span
                              className={cn(
                                "text-sm uppercase font-black whitespace-nowrap",
                                isDark ? "opacity-40" : "text-slate-500",
                              )}
                            >
                              {t("admin.config.example")}
                            </span>
                            <code
                              className={cn(
                                "text-sm font-mono break-all font-bold",
                                isDark
                                  ? "text-emerald-400"
                                  : "text-emerald-700",
                              )}
                            >
                              {activeNote.example}
                            </code>
                          </div>
                        )}
                      {activePath && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "text-sm uppercase font-black",
                              isDark ? "opacity-30" : "text-slate-400",
                            )}
                          >
                            Path
                          </span>
                          <code
                            className={cn(
                              "text-sm sm:text-sm font-mono break-all font-bold",
                              isDark ? "opacity-60" : "text-slate-500",
                            )}
                          >
                            {activePath}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
                <div
                  className={cn(
                    "text-sm sm:text-sm font-bold italic",
                    isDark ? "opacity-30" : "text-slate-400",
                  )}
                >
                  {t("admin.config.noteEmpty")}
                </div>
                {activePath && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-sm uppercase font-black",
                        isDark ? "opacity-30" : "text-slate-400",
                      )}
                    >
                      Path
                    </span>
                    <code
                      className={cn(
                        "text-sm sm:text-sm font-mono break-all font-bold",
                        isDark ? "opacity-60" : "text-slate-500",
                      )}
                    >
                      {activePath}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {embeddedTemplate && (
          <div className="flex items-center justify-end shrink-0 gap-2">
            <button
              type="button"
              className={cn(
                "h-8 rounded-lg border border-dashed px-3 text-sm font-black uppercase transition-colors inline-flex items-center gap-2",
                isDark
                  ? "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/10"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
              onClick={() => onChange(embeddedTemplate)}
            >
              <AlertTriangle size={16} />
              {t("admin.config.reset")}
            </button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex-1 h-full rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] border overflow-hidden shadow-lg relative min-h-[320px] transition-colors",
          isDark ? "bg-[#1e1e1e] border-white/10" : "bg-white border-slate-300",
        )}
      >
        <CodeMirrorEditor
          height="clamp(420px, 72vh, 960px)"
          width="100%"
          language="toml-config"
          theme={isDark ? "dark" : "light"}
          value={content}
          extensions={editorExtensions}
          onCreateEditor={(view) => {
            editorRef.current = view;
            const line = view.state.doc.lineAt(
              view.state.selection.main.head,
            ).number;
            setInternalActivePath(
              resolveActivePathFromDoc(view.state.doc, line),
            );
          }}
          onChange={(value) => {
            onChange(value);
          }}
          options={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 14,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            renderLineHighlight: "all",
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
};
