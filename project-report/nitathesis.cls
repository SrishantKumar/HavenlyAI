% NITA style for B.Tech, M.Tech and Ph.D Thesis Project Report
% -- morphed from the stanford style with numerous localizations!


%----------------------------- identification ---------------------------------
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{nitathesis}[2012/08/01 v1.0 NITA B.Tech , M. Tech, MCA , PhD  thesis report]
%----------------------------- initial code -----------------------------------

%--------------------------- declaration of options ---------------------------
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{report}}
%--------------------------- execution of options -----------------------------
\ProcessOptions
%--------------------------- package loading ----------------------------------
\LoadClass[12pt,a4paper,twoside]{report}

%-------------------------------- main code -----------------------------------
\renewcommand{\bibname}{References}

% \RequirePackage[usenames, dvipsnames]{xcolor}
\RequirePackage{amssymb}
% \RequirePackage{graphics}
% \RequirePackage{graphicx}
\RequirePackage{fancyhdr}
%\RequirePackage{eucal}
%\RequirePackage[USenglish]{babel}

%\RequirePackage[perpage]{footmisc}
%\RequirePackage[square, sort, numbers, authoryear]{natbib}
% \RequirePackage{ifthen}
\RequirePackage{blindtext}





\long\def\comment#1{}
\comment{
\usepackage[ pdftex,
            pdfpagelayout = None, %useoutlines,
            %bookmarks,
            %bookmarksopen = true,
            pdfstartview = FitH, %other options: Fit, FitB
            bookmarksnumbered = true,
            breaklinks = true,
            linktocpage,
            backref,
            colorlinks = true,
            linkcolor = blue,
            urlcolor  = blue,
            citecolor = blue,
            anchorcolor = blue,
            hyperindex = false,
            hyperfigures,
            a4paper,
            longtable,
            pdfpagemode = None,
            pdfauthor = {Anupamjamatia},
            pdftitle = {UG Thesis-2020},
            ]{hyperref}
}


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Page layout
%--------------

% We need 1" margins except on the binding edge, where it is 1 1/2"
% Theses are single-sided, so we don't care about \evensidemargin
%\oddsidemargin 2.5cm \evensidemargin 3.8cm % + 1inch= 3cm
\oddsidemargin 0.46cm \evensidemargin 0.46cm % + 1inch= 3cm
\marginparwidth 40pt \marginparsep 10pt
\topmargin 0pt \headsep 30pt
\textheight 22.5cm \textwidth 16cm
%\footheight 0cm
%\headheight 0cm


% Disallow page breaks at hyphens (this will give some underfull vbox's,
% so an alternative is to use \brokenpenalty=100 and manually search
% for and fix such page breaks)
\brokenpenalty=10000







%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Use 1.3 times the normal baseline-to-baseline skip
\renewcommand{\baselinestretch}{1.3}

% Figures and tables are to be numbered sequentially throughout the
% thesis, rather than within chapters; for style consistency, do
% equations the same.  The following \def of \cl@chapter is a kludge:
% really there should be a \removefromreset, to stop figure numbers,
% etc., from being reset at chapter beginnings

\def\cl@chapter{\@elt{section}\@elt{footnote}}
\def\thefigure{\@arabic\c@figure}
\def\thetable{\@arabic\c@table}
\def\theequation{\arabic{equation}}

% Redefine the macro used for floats (including figures and tables)
% so that single spacing is used. (Note \def\figure{\@float{figure}set
% single spacing} doesn't work because figure has an optional
% argument)
\def\@xfloat#1[#2]{\ifhmode \@bsphack\@floatpenalty -\@Mii\else
   \@floatpenalty-\@Miii\fi\def\@captype{#1}\ifinner
\@parmoderr\@floatpenalty\z@
\else\@next\@currbox\@freelist{\@tempcnta\csname ftype@#1\endcsname
\multiply\@tempcnta\@xxxii\advance\@tempcnta\sixt@@n \@tfor \@tempa
:=#2\do {\if\@tempa h\advance\@tempcnta \@ne\fi \if\@tempa
t\advance\@tempcnta \tw@\fi \if\@tempa b\advance\@tempcnta
4\relax\fi \if\@tempa p\advance\@tempcnta 8\relax\fi
}\global\count\@currbox\@tempcnta}\@fltovf\fi
\global\setbox\@currbox\vbox\bgroup
\def\baselinestretch{1}\@normalsize \boxmaxdepth\z@
\hsize\columnwidth \@parboxrestore}

% Redefine the macro used for footnotes to use single spacing
\long\def\@footnotetext#1{\insert\footins{\def\baselinestretch{1}\footnotesize
    \interlinepenalty\interfootnotelinepenalty 
    \splittopskip\footnotesep
    \splitmaxdepth \dp\strutbox \floatingpenalty \@MM
    \hsize\columnwidth \@parboxrestore
   \edef\@currentlabel{\csname p@footnote\endcsname\@thefnmark}\@makefntext
    {\rule{\z@}{\footnotesep}\ignorespaces
      #1\strut}}}

% \author, \title are defined in report; here are the rest of the
% front matter defining macros


\def\dept#1{\gdef\@dept{#1}}
\def\supervisor#1{\gdef\@supervisor{#1}}
\def\supervisorDesig#1{\gdef\@supervisorDesig{#1}}
\def\@supervisorDesig{Assistant Professor}
\def\hod#1{\gdef\@hod{#1}}
\def\externalexaminer#1{\gdef\@externalexaminer{#1}}
\def\degree#1{\mbox{\gdef\@degree{#1}}}
\def\submitdate#1{\gdef\@submitdate{#1}}
\def\copyrightyear#1{\gdef\@copyrightyear{#1}} % \author, \title in report
\def\specialization#1{\mbox{\gdef\@specialization{#1}}}
\def\maintitle#1{\gdef\@maintitle{#1}}
\def\RegNo#1{\gdef\@RegNo{#1}}
\def\dedication#1{\gdef\@dedication{#1}}
\def\@dedication{To our loving families, our teachers, and our friends who supported us every single day. This work is dedicated to everyone who ever felt sad, alone, or anxious, and needed a kind voice to listen.}
\def\@maintitle{HAVENLYAI: REAL-TIME CONVERSATIONAL ARTIFICIAL INTELLIGENCE PLATFORM FOR MENTAL WELLNESS AND AFFECTIVE GROUNDING}
\def\@title{HavenlyAI: Real-Time Conversational Artificial Intelligence Platform for Mental Wellness and Affective Grounding}
\def\@author{Srishant Kumar (23UICS169), Agrim Gupta (23UICS094), Aishwarya Pratap Singh (23UICS135), Kamal Nayan (23UICS093)}
\def\@RegNo{23UICS169, 23UICS094, 23UICS135, 23UICS093}
\def\@dept{Computer Science and Engineering}
\def\@extdept{IIIT Agartala}
\def\@supervisor{Dr. Sushmita Sharma}
\def\@extsupervisor{Project Mentor, Assistant Prof. IIIT Agartala}
\def\@hod{Dr. Ashim Saha}
\def\@externalexaminer{Signature with Seal}
\def\@degree{Bachelor of Technology}
  \def\@specialization{Computer Science \& Engineering}
\def\@college{Indian Institute of Information Technology Agartala}
\def\@extcollege{IIIT Agartala} 

\def\@submitdate{\ifcase\the\month\or
  January\or February\or March\or April\or May\or June\or
  July\or August\or September\or October\or November\or December\fi
  \space \number\the\year}
  
\def\@submitdatewc{\ifcase\the\month\or
  January\or February\or March\or APRIL\or MAY\or JUNE\or
  July\or August\or September\or October\or November\or December\fi,
  \space \number\the\year}

\newif\ifcopyright \newif\iffigurespage \newif\iftablespage
\copyrightfalse

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\def\coverp{%
    \thispagestyle{empty}%
    \renewcommand{\baselinestretch}{1}
    \null%
    \begin{center}
        \textbf{{\LARGE \uppercase \expandafter{\@maintitle}}}
    \end{center}
  \vskip 1.5cm 
  
  \begin{center}
    \begin{figure} [htb]
    \begin{center}
    \includegraphics[width=4.0cm,height=4.0cm,keepaspectratio]{images/iiit_logo.png}
    \end{center}
    \end{figure}
  \end{center}
  \vskip 1.0cm   
    \begin{center}
        \textbf{\large Submitted by:}\\[0.3cm]
        \begin{tabular}{cc}
          \textbf{Srishant Kumar} (23UICS169) & \textbf{Agrim Gupta} (23UICS094) \\[0.2cm]
          \textbf{Aishwarya Pratap Singh} (23UICS135) & \textbf{Kamal Nayan} (23UICS093)
        \end{tabular}
    \end{center}
    \vskip 1.2cm
    \begin{center}
        {\bf \expandafter{DEPARTMENT OF COMPUTER SCIENCE \& ENGINEERING}}\\
        {\bf {INDIAN INSTITUTE OF INFORMATION TECHNOLOGY AGARTALA\\AGARTALA, TRIPURA, INDIA - 799046}}\\
        \vskip 0.4cm
        \bf {\@submitdatewc}
    \end{center}

    \vskip 0.5cm
\newpage}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\def\titlep{%
    \thispagestyle{empty}%
    \renewcommand{\baselinestretch}{1}
    \null%
    \begin{center}
        \textbf{{\LARGE \uppercase \expandafter{\@maintitle}}}
    \end{center}
  \vskip .3cm
  
    \begin{center}
        \textbf {\textit{A Project Report submitted to\\
        \@college\\        
        for the award of the degree\\
        of\\
        \large \@degree}}\\
    \end{center}
    \begin{center}
        \textbf {\textit{by}}\\[0.2cm]
        \begin{tabular}{cc}
          \textbf{Srishant Kumar} (23UICS169) & \textbf{Agrim Gupta} (23UICS094) \\[0.15cm]
          \textbf{Aishwarya Pratap Singh} (23UICS135) & \textbf{Kamal Nayan} (23UICS093)
        \end{tabular}
    \end{center}
    \vskip .2cm 

    \begin{center}
       \textbf{ \textit{Under the Guidance and Mentorship of\\
       \vskip .2cm
        \large \@supervisor\\
	\small Project Mentor, Assistant Professor, IIIT Agartala}}
    \end{center}
    \vskip 0.3cm 

\begin{figure} [htb]
    \begin{center}
    \includegraphics[width=3.6cm,height=3.6cm,keepaspectratio]{images/iiit_logo.png}
    \end{center}
\end{figure}
    \begin{center}
        {\bf \expandafter \large \uppercase {{Department of Computer Science \& Engineering}}}\\
        {\bf \large \uppercase {Indian Institute of Information Technology Agartala}}\\
        \vskip 0.2cm
        \bf \large {\@submitdatewc}
    \end{center}
    \vskip 0.2cm
\newpage}
    
    \begin{center}
%        {\sl to the}\\
        
        %\copyright 2013 \@author. All rights reserved
        
    \end{center}

    \vskip 0.5cm
    
\newpage}

\def\copyrightpage{%
    \null\vfill
    \begin{center}
        \Large\copyright\ Copyright \@copyrightyear\\
        by\\
        \@author\\
    \end{center}
    \vfill\newpage}

    
\def\undertakingpage{\newpage%
    \renewcommand{\baselinestretch}{1.3}
    \vspace*{\fill}
    \centerline{\LARGE\bf UNDERTAKING}
    \vspace{3cm}
    \begin{center}
    \begin{minipage}{5.5in}
    \parindent=0pt
    I declare that the work presented in this project proposal titled
    ``{\sl\@title}'', submitted to the \mbox{\@dept} Department,\@college, for 
    the award of the {\bf\emph \@degree} degree in \mbox{\bf\emph \@specialization}, 
    is my original work. I have not plagiarized or submitted the same work for 
    the award of any other degree. In case this undertaking is found incorrect, I accept 
    that my degree may be unconditionally withdrawn.\par
    \vspace*{2cm}
    \@submitdatewc\\Agartala\par
    \hbox to 4.5in {
    \hfill\vbox{\hsize 2in\vrule width 2in height0.4pt\vspace*{-4mm}\par\center{\@author}}}


    \vspace*{5cm}
    \end{minipage}
    \end{center}
}


%%%%%%%%%%%%%%%%%%Declaration Page%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


    
\def\declaration{\newpage%
    \renewcommand{\baselinestretch}{1.3}
    \centerline{\LARGE\bf DECLARATION}
    \vspace{1.5cm}
    \begin{center}
    \begin{minipage}{5.5in}
    \parindent=0pt
    
    We declare that the work presented in this report titled ``{\sl\@title}'', submitted to the \mbox{\@dept} Department, \@college, for the award of the {\bf\emph \@degree} degree in \mbox{\bf\emph \@specialization}, represents our ideas in our own words. Where others' ideas or words have been included, we have adequately cited and referenced the original sources. We also declare that we have adhered to all principles of academic honesty and integrity, and have not misrepresented, fabricated, or falsified any idea, data, fact, or source in our submission. We understand that any violation of the above will be a cause for disciplinary action by the Institute and can also evoke penal action from the sources which have thus not been properly cited.\par
    \vspace*{0.8cm}
    \@submitdatewc\\Agartala, Tripura\par

    \vspace*{1.2cm}
    \begin{tabular}{p{2.6in}p{2.6in}}
      \rule{2.2in}{0.4pt} & \rule{2.2in}{0.4pt} \\
      \textbf{Srishant Kumar} & \textbf{Agrim Gupta} \\
      Enrollment No: 23UICS169 & Enrollment No: 23UICS094 \\[1.2cm]
      \rule{2.2in}{0.4pt} & \rule{2.2in}{0.4pt} \\
      \textbf{Aishwarya Pratap Singh} & \textbf{Kamal Nayan} \\
      Enrollment No: 23UICS135 & Enrollment No: 23UICS093 \\
    \end{tabular}

    \vspace*{1.5cm}
    \end{minipage}
    \end{center}
}

%55555555555555555555555555555
\long\def\approvalsheetpreabmle{%
\parindent=0pt
This project report entitled ``{\sl\@title}'', submitted by \textbf{Srishant Kumar} (23UICS169), \textbf{Agrim Gupta} (23UICS094), \textbf{Aishwarya Pratap Singh} (23UICS135), and \textbf{Kamal Nayan} (23UICS093), is approved in partial fulfilment of the requirements for the award of \textit{\textbf{Bachelor of Technology}} in \textit{\textbf{Computer Science \& Engineering}}, Indian Institute of Information Technology Agartala. \par
\vspace{2.5cm}}

\long\def\signature#1{%
\parbox{0.47\textwidth}{\hrulefill\par#1}
}

\def\approvalsheet{%
    \renewcommand{\baselinestretch}{1.3}

    \centerline{\LARGE\bf REPORT APPROVAL FOR B.TECH}
    \vspace{1.5cm}

\approvalsheetpreabmle
    \signature{
        \centerline{\small \textbf{Dr. Sushmita Sharma}}\par
	\centerline{\small Project Mentor / Supervisor}\par
        \centerline{\small Assistant Professor}\par
        \centerline{\small Department of Computer Science \& Engineering}\par
        \centerline{\small IIIT Agartala}}\hfill
    \signature{
	\centerline{\small \textbf{Dr. Ashim Saha}}\par
	\centerline{\small Head of the Department}\par
        \centerline{\small Department of Computer Science \& Engineering}\par
        \centerline{\small IIIT Agartala}}\hfill
\vspace{2cm}
    \mbox{
        \leftline{Date:\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_}
        }
    \mbox{    
        \leftline{Place: IIIT Agartala}
        }\hfill
    
    \vspace*{\fill}
    \vfill\newpage
}

%55555555555555555555555555555
\long\def\internapprovalsheetpreabmle{%
\parindent=0pt
This project report entitled ``{\sl\@title}'', submitted by \textbf{Srishant Kumar} (23UICS169), \textbf{Agrim Gupta} (23UICS094), \textbf{Aishwarya Pratap Singh} (23UICS135), and \textbf{Kamal Nayan} (23UICS093), is approved in partial fulfilment of the requirements for the award of \textit{\textbf{Bachelor of Technology}} in \textit{\textbf{Computer Science \& Engineering}}, Indian Institute of Information Technology Agartala. \par
\vspace{2.5cm}}

\def\internapprovalsheet{%
    \renewcommand{\baselinestretch}{1.3}

    \centerline{\LARGE\bf REPORT APPROVAL FOR B.TECH}
    \vspace{1.5cm}

\internapprovalsheetpreabmle
    \signature{
        \centerline{\small \textbf{Dr. Sushmita Sharma}}\par
	\centerline{\small Project Mentor / Supervisor}\par
        \centerline{\small Assistant Professor}\par
        \centerline{\small Department of Computer Science \& Engineering}\par
        \centerline{\small IIIT Agartala}}\hfill
    \signature{
	\centerline{\small \textbf{Dr. Ashim Saha}}\par
	\centerline{\small Head of the Department}\par
        \centerline{\small Department of Computer Science \& Engineering}\par
        \centerline{\small IIIT Agartala}}\hfill

\vspace{2cm}
    \mbox{
        \leftline{Date:\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_}
        }
    \mbox{    
        \leftline{Place: IIIT Agartala}
        }\hfill
    
    \vspace*{\fill}
    \vfill\newpage
}

%55555555555555555555555555555
\long\def\signaturepreabmle{%
\parindent=0pt
It is certified that the work contained in the project report titled ``{\sl\@title}'', submitted by \textbf{Srishant Kumar} (23UICS169), \textbf{Agrim Gupta} (23UICS094), \textbf{Aishwarya Pratap Singh} (23UICS135), and \textbf{Kamal Nayan} (23UICS093), has been carried out under our guidance and supervision. This work has not been submitted elsewhere for the award of any other degree.\par
\vspace{2.5cm}}

\def\signaturepage{%
    \renewcommand{\baselinestretch}{1.3}

    \centerline{\LARGE\bf CERTIFICATE}
    \vspace{2cm}

\signaturepreabmle
     \null\hfill 
    \signature{
	\centerline{\small \textbf{Dr. Sushmita Sharma}}\par
        \centerline{\small Project Mentor}\par
        \centerline{\small Assistant Professor}\par
	\centerline{\small Department of Computer Science \& Engineering}\par
        \centerline{\small IIIT Agartala}\par
	}\hfill
    \vspace*{\fill}
}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

%55555555555555555555555555555
\long\def\internshipsignaturepreabmle{%
\parindent=0pt
It is certified that the work contained in the report titled ``{\sl\@title}'', by {\textbf{\@author}} (Enrollment No: {\sl\@RegNo}), has been carried out under our supervision. This work has not been submitted elsewhere for a degree.
\par
\vspace{3cm}}



% \long\def\signature#1{%
% \parbox{0.47\textwidth}{\hrulefill\par#1}
% }

\long\def\Iinternshipsignaturepreabmle{%
\parindent=0pt
The dissertation titled ``{\sl\@title}'', by {\textbf{\@author}} bearing Enrollment Number {\sl\@RegNo}, is endorsed for submission for the Bachelor of Technology in Computer Science \&  Engineering, NIT Agartala.
\par
\vspace{3cm}}


% \long\def\signature#1{%
% \parbox{0.47\textwidth}{\hrulefill\par#1}
% }


\def\internshipsignaturepage{%
    \renewcommand{\baselinestretch}{1.3}




%\vspace*{\fill}
    \centerline{\LARGE\bf CERTIFICATE}
    \vspace{2cm}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\internshipsignaturepreabmle
     \null\hfill 
    \signature{
	\centerline{\small Internship/Industry Supervisor}\par %% Name of the HOD
	\centerline{\small (Designation)}\par
	\centerline{\small Section Name}\par 
         \centerline{\small Department Name }\par
       \centerline{\small Organisation Name}\par
        %\@dept \ Dept.\par
        % abcd University
	}\hfill
    \vspace*{\fill}

\Iinternshipsignaturepreabmle
     \null\hfill 
    \signature{
	\centerline{\@supervisor}\par
        \centerline{\@supervisorDesig}\par
	\centerline{\@dept \ Department}\par
 \centerline{\@extdept}\par 
        %\@dept \ Dept.\par
        % abcd University
	}\hfill
    \vspace*{\fill}
}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


%5555555555555555555555555555

\def\beforepreface{
    \pagenumbering{roman}
    \pagestyle{plain}
    \coverp
    %\clearpage\mbox{}\clearpage
    \titlep
    \ifcopyright\copyrightpage\fi
    %\prefacesection{Dedicated To}
    \renewcommand{\baselinestretch}{1.3}
    \centerline{\LARGE\bf Dedicated To}
    \vspace{2cm}
    \begin{center}
    \begin{minipage}{5.5in}
    \parindent=0pt
    \@dedication
\end{minipage}
\end{center}
     
  
\end{minipage}
\end{center}

\newpage
\vspace*{6cm}
\begin{center}
\textit{\textbf { \begin{large} \ding{125}If I have seen further than others, it is by standing upon the shoulders of giants.\ding{126}\end{large}}}\\
\vspace*{0.1cm} 
\hspace*{5.0cm} \textbf{- Isaac Newton}
\end{center}
    \newpage
    \approvalsheet
    \internapprovalsheet
    \declaration
    \newpage
    \signaturepage
    \newpage
    \internshipsignaturepage
    }

\def\prefacesection#1{%
    \chapter*{#1}
    \addcontentsline{toc}{chapter}{#1}}


% The \addvspace business below is to avoid the extra space that gets put
% in the tables of figures and tables between chapters (it makes no sense
% now that the numbering is continuous)
\def\afterpreface{\newpage
    \tableofcontents
    \newpage
    \iftablespage
        {\addvspace{10pt}
        \let\saveaddvspace=\addvspace
        \def\addvspace##1{}

        \listoftables
        \let\addvspace=\saveaddvspace}
        \newpage
    \fi
    \iffigurespage
        {\addvspace{10pt}
        \let\saveaddvspace=\addvspace
        \def\addvspace##1{}

        \listoffigures
        \let\addvspace=\saveaddvspace}
        \newpage
    \fi
    \pagenumbering{arabic}
    \pagestyle{plain}
}

\setcounter{secnumdepth}{3}

\def\subsubsection{\@startsection{subsubsection}{3}{\z@}{-3.25ex plus  -1ex minus -.2ex}{1.5ex plus .2ex}{\large\sl}}
\def\thesubsubsection{\hbox{\vrule height 1ex width .75ex depth .3ex}}

%
%
% Some Theorem Environments
%
%


\newtheorem{condition}{Condition}
\newtheorem{proposition}{Proposition}[chapter]
\newtheorem{theorem}{Theorem}[chapter]
\newtheorem{defn}{Definition}[chapter]
\newtheorem{conjecture}{Conjecture}[chapter]
\newtheorem{lemma}[theorem]{Lemma}
\newtheorem{corollary}[theorem]{Corollary}
\newtheorem{problem}{Problem}[chapter]
\newtheorem{subproblem}{Subproblem}[chapter]


\newenvironment{definition}{\begin{defn}\em}{\end{defn}}
\newenvironment{proof}{\noindent{\bf Proof:}\hspace  {5mm}}{
\nopagebreak\nobreak\quad\nopagebreak\nobreak\proofbox\medskip}
\newenvironment{example}{\noindent{\bf Example}\quad}{
\nopagebreak\nobreak\quad\nobreak\nopagebreak\proofbox\smallskip}

\newcounter{case}
\newenvironment{case}{\begin{list}{\bf Case \arabic{case}:}%
{\usecounter{case}%
\labelwidth 5em
\leftmargin 5em
\setlength\listparindent{\parindent}
\makelabel}
\def\case{\item }}{\end{list}\nobreak\nopagebreak\quad\nopagebreak\nobreak\proofbox\bigskip}
\def\proofbox{\hbox{\vrule height1.2ex depth.3ex width0.8ex}}


% Get References instead of Bibliography
\def\thebibliography#1{\chapter*{References\@mkboth
% {BIBLIOGRAPHY}{BIBLIOGRAPHY}}
 {References}{References}}
 \addcontentsline{toc}{chapter}{References}%\bf
 \list
 {[\arabic{enumi}]}{\settowidth\labelwidth{[#1]}\leftmargin\labelwidth
 \advance\leftmargin\labelsep
 \usecounter{enumi}}
 \def\newblock{\hskip .11em plus .33em minus .07em}
 \sloppy\clubpenalty4000\widowpenalty4000
 \sfcode`\.=1000\relax}
\let\endthebibliography=\endlist


\RequirePackage{setspace}
\onehalfspacing
% \singlespacing
%\doublespacing
\setlength{\parskip}{12pt}

\renewcommand*\arraystretch{1.5}
%\RequirePackage{fancyhdr}
%\pagestyle{fancy}

\RequirePackage[hang,small]{caption}
\RequirePackage{multirow}
\RequirePackage{enumerate}

\renewcommand{\@makechapterhead}[1]{%
\vspace*{50\p@}%
{\parindent \z@ \raggedright \normalfont
\ifnum \c@secnumdepth >\m@ne
\huge \@chapapp\space \thechapter % Chapter number
\par\nobreak
\vspace{-10pt}
\fi
\interlinepenalty\@M
\Huge \bf #1\par % chapter title
\nobreak
\vskip 40\p@
}}

\renewcommand{\@makeschapterhead}[1]{%
\vspace*{50\p@}%
{\parindent \z@ \raggedright
\normalfont
\interlinepenalty\@M
\Huge \bf #1\par % chapter title
\nobreak
\vskip 40\p@
}}

\endinput



% --> Remove dots in TOC [24/10/2001] Thanks to the tocloft documentation! [10/11/2001]
% \renewcommand{\@dotsep}{10000}

