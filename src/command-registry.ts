import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";

import backgroundColor from "@/keybindings/backgroundColor";
import bottom from "@/keybindings/bottom";
import changeCase from "@/keybindings/changeCase";
import changeCaseLowerCase from "@/keybindings/changeCaseLowerCase";
import changeCaseUpperCase from "@/keybindings/changeCaseUpperCase";
import changeCurrentBlock from "@/keybindings/changeCurrentBlock";
import collapse from "@/keybindings/collapse";
import collapseAll from "@/keybindings/collapseAll";
import command from "@/keybindings/command";
import copyCurrentBlockContent from "@/keybindings/copyCurrentBlockContent";
import copyCurrentBlockRef from "@/keybindings/copyCurrentBlockRef";
import cut from "@/keybindings/cut";
import cutWord from "@/keybindings/cutWord";
import decrease from "@/keybindings/decrease";
import deleteCurrentAndNextSiblingBlocks from "@/keybindings/deleteCurrentAndNextSiblingBlocks";
import disableCapture from "@/keybindings/disableCapture";
import deleteCurrentAndPrevSiblingBlocks from "@/keybindings/deleteCurrentAndPrevSiblingBlocks";
import deleteCurrentBlock from "@/keybindings/deleteCurrentBlock";
import down from "@/keybindings/down";
import emoji from "@/keybindings/emoji";
import exitEditing from "@/keybindings/exitEditing";
import extend from "@/keybindings/extend";
import extendAll from "@/keybindings/extendAll";
import findChar from "@/keybindings/findChar";
import findCharBackward from "@/keybindings/findCharBackward";
import firstNonBlank from "@/keybindings/firstNonBlank";
import highlightFocusIn from "@/keybindings/highlightFocusIn";
import highlightFocusOut from "@/keybindings/highlightFocusOut";
import increase from "@/keybindings/increase";
import indent from "@/keybindings/indent";
import insert from "@/keybindings/insert";
import insertBefore from "@/keybindings/insertBefore";
import joinNextLine from "@/keybindings/joinNextLine";
import jumpInto from "@/keybindings/jumpInto";
import left from "@/keybindings/left";
import lineEnd from "@/keybindings/lineEnd";
import mark from "@/keybindings/mark";
import nextNewBlock from "@/keybindings/nextNewBlock";
import nextSibling from "@/keybindings/nextSibling";
import number from "@/keybindings/number";
import openSettings from "@/keybindings/openSettings";
import operators from "@/keybindings/operators";
import outdent from "@/keybindings/outdent";
import pasteNext from "@/keybindings/pasteNext";
import pastePrev from "@/keybindings/pastePrev";
import prevNewBlock from "@/keybindings/prevNewBlock";
import prevSibling from "@/keybindings/prevSibling";
import redo from "@/keybindings/redo";
import repeatCharSearch from "@/keybindings/repeatCharSearch";
import repeatCharSearchReverse from "@/keybindings/repeatCharSearchReverse";
import replace from "@/keybindings/replace";
import right from "@/keybindings/right";
import search from "@/keybindings/search";
import searchBaidu from "@/keybindings/searchBaidu";
import searchGithub from "@/keybindings/searchGithub";
import searchGoogle from "@/keybindings/searchGoogle";
import searchStackoverflow from "@/keybindings/searchStackoverflow";
import searchWikipedia from "@/keybindings/searchWikipedia";
import searchYoutube from "@/keybindings/searchYoutube";
import showRegister from "@/keybindings/showRegister";
import sort from "@/keybindings/sort";
import toggleVisualMode from "@/keybindings/toggleVisualMode";
import top from "@/keybindings/top";
import undo from "@/keybindings/undo";
import up from "@/keybindings/up";
import visualLineMode from "@/keybindings/visualLineMode";
import wordBackward from "@/keybindings/wordBackward";
import wordEnd from "@/keybindings/wordEnd";
import wordForward from "@/keybindings/wordForward";
import { registerCommandRegistrars } from "@/runtime/command-registration";
import type { CommandRegistrar } from "@/runtime/command-registration";

export type OwnedCommandRegistrar = CommandRegistrar<ILSPluginUser>;

export const COMMAND_REGISTRY: readonly OwnedCommandRegistrar[] = [
  { id: "number", register: number },
  { id: "undo", register: undo },
  { id: "redo", register: redo },
  { id: "search", register: search },
  { id: "insert", register: insert },
  { id: "insert-before", register: insertBefore },
  { id: "top", register: top },
  { id: "bottom", register: bottom },
  { id: "next-sibling", register: nextSibling },
  { id: "previous-sibling", register: prevSibling },
  { id: "up", register: up },
  { id: "down", register: down },
  { id: "left", register: left },
  { id: "right", register: right },
  { id: "word-forward", register: wordForward },
  { id: "word-backward", register: wordBackward },
  { id: "word-end", register: wordEnd },
  { id: "line-end", register: lineEnd },
  { id: "first-nonblank", register: firstNonBlank },
  { id: "find-character", register: findChar },
  { id: "find-character-backward", register: findCharBackward },
  { id: "repeat-character-search", register: repeatCharSearch },
  { id: "repeat-character-search-reverse", register: repeatCharSearchReverse },
  { id: "indent", register: indent },
  { id: "outdent", register: outdent },
  { id: "next-new-block", register: nextNewBlock },
  { id: "previous-new-block", register: prevNewBlock },
  { id: "delete-current-block", register: deleteCurrentBlock },
  {
    id: "delete-current-and-next-siblings",
    register: deleteCurrentAndNextSiblingBlocks,
  },
  {
    id: "delete-current-and-previous-siblings",
    register: deleteCurrentAndPrevSiblingBlocks,
  },
  { id: "change-current-block", register: changeCurrentBlock },
  { id: "copy-current-block-content", register: copyCurrentBlockContent },
  { id: "copy-current-block-reference", register: copyCurrentBlockRef },
  { id: "paste-next", register: pasteNext },
  { id: "paste-previous", register: pastePrev },
  { id: "collapse", register: collapse },
  { id: "extend", register: extend },
  { id: "collapse-all", register: collapseAll },
  { id: "extend-all", register: extendAll },
  { id: "highlight-focus-in", register: highlightFocusIn },
  { id: "highlight-focus-out", register: highlightFocusOut },
  { id: "search-baidu", register: searchBaidu },
  { id: "search-github", register: searchGithub },
  { id: "search-google", register: searchGoogle },
  { id: "search-stack-overflow", register: searchStackoverflow },
  { id: "search-wikipedia", register: searchWikipedia },
  { id: "search-youtube", register: searchYoutube },
  { id: "show-unnamed-register", register: showRegister },
  { id: "disable-key-capture", register: disableCapture },
  { id: "exit-editing", register: exitEditing },
  { id: "jump-into", register: jumpInto },
  { id: "join-next-line", register: joinNextLine },
  { id: "increase", register: increase },
  { id: "decrease", register: decrease },
  { id: "cut", register: cut },
  { id: "cut-word", register: cutWord },
  { id: "text-operators", register: operators },
  { id: "replace", register: replace },
  { id: "visual-mode", register: toggleVisualMode },
  { id: "visual-line-mode", register: visualLineMode },
  { id: "change-case", register: changeCase },
  { id: "change-case-uppercase", register: changeCaseUpperCase },
  { id: "change-case-lowercase", register: changeCaseLowerCase },
  { id: "sort", register: sort },
  { id: "background-color", register: backgroundColor },
  { id: "command", register: command },
  { id: "open-settings", register: openSettings },
  { id: "mark", register: mark },
  { id: "emoji", register: emoji },
];

export const registerOwnedCommands = (
  logseq: ILSPluginUser,
  registry: readonly OwnedCommandRegistrar[] = COMMAND_REGISTRY
): void => {
  registerCommandRegistrars(logseq, registry);
};
