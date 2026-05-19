import { useState } from "react";

interface ToolParam {
  name: string;
  type: string;
  required: boolean;
  desc: string;
}

interface ToolDef {
  name: string;
  description: string;
  params: ToolParam[];
}

const tools: ToolDef[] = [
  {
    name: "read",
    description: "Read file contents. Supports text and images (jpg, png, gif, webp).",
    params: [
      { name: "path", type: "string", required: true, desc: "Path to the file" },
      { name: "offset", type: "number", required: false, desc: "Line number to start from" },
      { name: "limit", type: "number", required: false, desc: "Max lines to read" },
    ],
  },
  {
    name: "bash",
    description: "Execute a bash command in the current working directory.",
    params: [
      { name: "command", type: "string", required: true, desc: "Bash command to execute" },
      { name: "timeout", type: "number", required: false, desc: "Timeout in seconds" },
    ],
  },
  {
    name: "edit",
    description: "Make precise file edits with exact text replacement.",
    params: [
      { name: "path", type: "string", required: true, desc: "Path to the file to edit" },
      { name: "edits", type: "{oldText,newText}[]", required: true, desc: "Array of replacements" },
    ],
  },
  {
    name: "write",
    description: "Create or overwrite files. Auto-creates parent directories.",
    params: [
      { name: "path", type: "string", required: true, desc: "Path to the file" },
      { name: "content", type: "string", required: true, desc: "Content to write" },
    ],
  },
  {
    name: "arxiv_search",
    description: "Search arXiv for research papers by keyword, category, and date range.",
    params: [
      { name: "query", type: "string", required: true, desc: "Search query" },
      { name: "max_results", type: "number", required: false, desc: "1–50, default 10" },
      { name: "category", type: "string", required: false, desc: "e.g. cs.AI, cs.LG" },
      { name: "date_from", type: "string", required: false, desc: "YYYY-MM-DD" },
      { name: "date_to", type: "string", required: false, desc: "YYYY-MM-DD" },
      { name: "sort_by", type: "string", required: false, desc: "relevance / lastUpdatedDate / submittedDate" },
    ],
  },
  {
    name: "arxiv_download",
    description: "Download a paper from arXiv by its ID. Saves metadata and attempts full-text extraction.",
    params: [
      { name: "paper_id", type: "string", required: true, desc: "arXiv paper ID (e.g. 2605.07395)" },
    ],
  },
  {
    name: "arxiv_read",
    description: "Read a previously downloaded arXiv paper from local storage.",
    params: [
      { name: "paper_id", type: "string", required: true, desc: "arXiv paper ID" },
    ],
  },
  {
    name: "arxiv_list",
    description: "List all downloaded arXiv papers, optionally filtered by category.",
    params: [
      { name: "category", type: "string", required: false, desc: "Filter by arXiv category" },
    ],
  },
  {
    name: "memory",
    description: "Add, replace, or remove entries in persistent memory (MEMORY.md / USER.md).",
    params: [
      { name: "action", type: "add|replace|remove|dream", required: true, desc: "Memory operation" },
      { name: "target", type: "memory|user", required: true, desc: "Memory target" },
      { name: "content", type: "string", required: false, desc: "Content for add/replace" },
      { name: "old_text", type: "string", required: false, desc: "Text to replace/remove" },
    ],
  },
  {
    name: "crucible_begin_skill",
    description: "Signal the start of a CRUCIBLE skill execution.",
    params: [
      { name: "skill_id", type: "string", required: true, desc: "ID of the skill to execute" },
    ],
  },
  {
    name: "crucible_register_skill",
    description: "Register a new CRUCIBLE skill for pattern tracking and compilation.",
    params: [
      { name: "skill_id", type: "string", required: true, desc: "Unique kebab-case identifier" },
      { name: "title", type: "string", required: true, desc: "Short human-readable title" },
      { name: "description", type: "string", required: false, desc: "One-line description" },
      { name: "tag", type: "string", required: false, desc: "pure_transform | creative | side_effect_critical" },
      { name: "llm_prompt", type: "string", required: true, desc: "Instructions for the LLM" },
    ],
  },
  {
    name: "crucible_end_skill",
    description: "Signal the end of a CRUCIBLE skill execution.",
    params: [
      { name: "skill_id", type: "string", required: true, desc: "ID of the skill being completed" },
    ],
  },
];

export function ToolsPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="tools-panel">
      <div className="tools-header">
        <span className="tools-icon">🔧</span>
        <h3 className="tools-title">Available Tools</h3>
        <span className="tools-count">{tools.length}</span>
      </div>
      <div className="tools-list">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className={`tool-card ${expanded === tool.name ? "tool-card--expanded" : ""}`}
          >
            <button
              className="tool-trigger"
              onClick={() => setExpanded(expanded === tool.name ? null : tool.name)}
            >
              <code className="tool-name">{tool.name}</code>
              <span className="tool-chevron">{expanded === tool.name ? "▾" : "▸"}</span>
            </button>
            {expanded === tool.name && (
              <div className="tool-detail">
                <p className="tool-desc">{tool.description}</p>
                <div className="tool-params">
                  <h4 className="params-title">Parameters</h4>
                  {tool.params.map((p) => (
                    <div key={p.name} className="param-row">
                      <span className={`param-badge ${p.required ? "param-required" : "param-optional"}`}>
                        {p.required ? "req" : "opt"}
                      </span>
                      <code className="param-name">{p.name}</code>
                      <span className="param-type">{p.type}</span>
                      <span className="param-desc">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
