export function CodeExample({ code }: { code: string }) {
  const tokens = code.split(
    /(#.*$|'[^'\n]*'|"[^"\n]*"|\b(?:def|return|for|in|if|elif|else|while|import|from|as|with|try|except|raise|assert|True|False|None|and|or|not)\b|\b\d+(?:\.\d+)?\b)/gm,
  );
  return (
    <pre>
      <code>
        {tokens.map((token, i) => {
          const kind = token.startsWith("#")
            ? "comment"
            : /^['"]/.test(token)
              ? "string"
              : /^\d/.test(token)
                ? "number"
                : /^(def|return|for|in|if|elif|else|while|import|from|as|with|try|except|raise|assert|True|False|None|and|or|not)$/.test(
                      token,
                    )
                  ? "keyword"
                  : "";
          return (
            <span className={kind ? "code-" + kind : undefined} key={i}>
              {token}
            </span>
          );
        })}
      </code>
    </pre>
  );
}
