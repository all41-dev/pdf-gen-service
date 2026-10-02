import { generatePdfFromLatex } from './generatePdfFromLatex';

async function main() {
  const latexTemplate = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{fontspec}      % XeLaTeX font handling, supports Unicode directly
\usepackage[margin=2cm]{geometry}

% Values like this are what your service will fill in from job data
\newcommand{\customer}{Jean Dupont}
\newcommand{\invoiceno}{2026-0042}

\begin{document}

\section*{Invoice \invoiceno}

Hello \customer,

Thank you for your order. Accents work directly in XeLaTeX: café, Zürich, naïve.

Special characters must be escaped: 50\% discount, R\&D, price \$20, file\_name.

\begin{tabular}{|l|r|}
  \hline
  \textbf{Item} & \textbf{Price (CHF)} \\
  \hline
  PDF generation & 120.00 \\
  Support        &  30.00 \\
  \hline
  \textbf{Total} & \textbf{150.00} \\
  \hline
\end{tabular}

\end{document}`;
  await generatePdfFromLatex(latexTemplate, 'result');
}

main();
