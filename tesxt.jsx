import { useEffect } from "react";

export default function Test() {
  useEffect(() => {
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Hello, world" }],
      }),
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  }, []);

  return <div>테스트 중...</div>;
}