import React, { useEffect } from "react";

export default function Sobre() {
  useEffect(() => {
    // Remove qualquer instância antiga para garantir carregamento limpo
    const existingScript = document.getElementById("bmc-widget-script");
    if (existingScript) existingScript.remove();
    const existingWidget = document.getElementById("bmc-wbtn");
    if (existingWidget) existingWidget.remove();

    // Adiciona o script do BMC widget apenas nesta página
    const script = document.createElement("script");
    script.id = "bmc-widget-script";
    script.setAttribute("data-name", "BMC-Widget");
    script.setAttribute("data-cfasync", "false");
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    script.setAttribute("data-id", "pedrotalaia");
    script.setAttribute("data-description", "Support me on Buy me a coffee!");
    script.setAttribute("data-message", "");
    script.setAttribute("data-color", "#FFDD00");
    script.setAttribute("data-position", "right");
    script.setAttribute("data-x_margin", "18");
    script.setAttribute("data-y_margin", "100");
    script.async = true;

    // Fallback: se o widget não for criado pelo script, renderiza um link simples
    const handleLoad = () => {
      setTimeout(() => {
        const widget = document.getElementById("bmc-wbtn");
        if (!widget) {
          const fallback = document.createElement("a");
          fallback.id = "bmc-wbtn";
          fallback.href = "https://www.buymeacoffee.com/pedrotalaia";
          fallback.target = "_blank";
          fallback.rel = "noopener noreferrer";
          fallback.title = "Buy me a coffee";
          fallback.innerText = "☕️ Apoie o projeto";
          Object.assign(fallback.style, {
            position: "fixed",
            right: "18px",
            bottom: "100px",
            background: "#FFDD00",
            color: "#000",
            padding: "8px 12px",
            borderRadius: "999px",
            textDecoration: "none",
            zIndex: "9999",
            boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
          });
          document.body.appendChild(fallback);
        }
      }, 300);
    };

    script.addEventListener("load", handleLoad);
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script e widget/fallback
      script.removeEventListener("load", handleLoad);
      const s = document.getElementById("bmc-widget-script");
      if (s) s.remove();
      const widget = document.getElementById("bmc-wbtn");
      if (widget) widget.remove();
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Sobre o Projeto</h1>
      <p className="mb-4">
        Este projeto é <strong>open source</strong> e o repositório oficial está disponível em:
        <br />
        <a
          href="https://github.com/pedrotalaia/buracos-de-portugal.git"
          className="text-blue-600 underline break-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://github.com/pedrotalaia/buracos-de-portugal.git
        </a>
      </p>

      <h2 className="text-2xl font-semibold mb-2">Objetivo</h2>
      <p className="mb-4">
        O objetivo do projeto é permitir que a comunidade reporte buracos e problemas nas estradas de
        Portugal, centralizando evidências (fotos, localização e descrições) para ajudar na priorização
        de intervenções. A plataforma fornece contexto local e uma forma de votar na gravidade dos
        problemas, ajudando cidadãos e organizações a identificar bolos críticos.
      </p>

      <h2 className="text-2xl font-semibold mb-2">Como funciona</h2>
      <p className="mb-4">
        Os utilizadores podem submeter relatórios com uma imagem, descrição e localização. Outros
        utilizadores podem ver os relatórios num mapa, comentar e votar. Os dados são públicos e podem
        ser usados por câmaras municipais, grupos comunitários e jornalistas para priorizar reparações.
      </p>

      <h2 className="text-2xl font-semibold mb-2">Privacidade</h2>
      <p className="mb-4">
        As submissões devem evitar informação pessoal identificável. Fotografias e descrições são
        armazenadas para permitir a investigação e acção; não vendemos dados e seguimos práticas
        responsáveis no tratamento da informação.
      </p>

      <h2 className="text-2xl font-semibold mb-2">Contribuir</h2>
      <p className="mb-4">
        Contribuições são bem-vindas: abra issues, envie pull requests ou sugira melhorias no
        repositório. Se quiser apoiar financeiramente o desenvolvimento, utilize o botão "Buy me a
        coffee" nesta página.
      </p>

      <h2 className="text-2xl font-semibold mb-2">Roadmap</h2>
      <p className="mb-4">
        Futuras funcionalidades planeadas incluem integração com fontes oficiais, melhorias na
        moderação de relatórios, notificações para autoridades locais e análises agregadas por região.
      </p>

      <div className="flex justify-center mt-8">
        {/* BMC widget carregado dinamicamente */}
      </div>
    </div>
  );
}
