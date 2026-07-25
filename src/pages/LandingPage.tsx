import { Mic, Network, RefreshCw } from "lucide-react";
import { Fragment, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";

import "../features/landing/staticLanding.css";

const headline = "Tu ruta a AWS no debería empezar con otra pestaña.";
const headlineWords = headline.split(" ");
const headlineLetterCount = Array.from(headline.replaceAll(" ", "")).length;
const headlineAccentWordIndex = 6;

function shuffledDelays(): number[] {
  const order = Array.from(
    { length: headlineLetterCount },
    (_, index) => index,
  );
  for (let index = order.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[randomIndex]] = [order[randomIndex], order[index]];
  }

  const delays = Array.from({ length: headlineLetterCount }, () => 0);
  order.forEach((letterIndex, position) => {
    delays[letterIndex] = position * 18;
  });
  return delays;
}

function AnimatedHeadline() {
  const [swapped, setSwapped] = useState(false);
  const [delays, setDelays] = useState(() =>
    Array.from({ length: headlineLetterCount }, () => 0),
  );
  let letterIndex = 0;

  function swap(next: boolean) {
    setDelays(shuffledDelays());
    setSwapped(next);
  }

  return (
    <h1
      className={`static-landing__headline${swapped ? " is-swapped" : ""}`}
      aria-label={headline}
      onMouseEnter={() => swap(true)}
      onMouseLeave={() => swap(false)}
    >
      {headlineWords.map((word, wordIndex) => (
        <Fragment key={wordIndex}>
          {wordIndex === headlineAccentWordIndex ? (
            <br aria-hidden="true" />
          ) : null}
          <span
            className={`landing-title-word${
              wordIndex >= headlineAccentWordIndex
                ? " landing-title-word--accent"
                : ""
            }`}
            aria-hidden="true"
          >
            {Array.from(word).map((letter) => {
              const currentIndex = letterIndex;
              letterIndex += 1;
              return (
                <span
                  className="landing-title-letter"
                  style={
                    {
                      "--letter-delay": `${delays[currentIndex]}ms`,
                    } as CSSProperties
                  }
                  key={currentIndex}
                >
                  <span className="landing-title-primary">{letter}</span>
                  <span className="landing-title-secondary">{letter}</span>
                </span>
              );
            })}
          </span>
          {wordIndex < headlineWords.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h1>
  );
}

const steps = [
  {
    icon: Mic,
    title: "Habla, no llenes formularios",
    copy: "Una conversación de voz de menos de cinco minutos revela tu experiencia, tu ritmo y cómo aprendes mejor.",
  },
  {
    icon: Network,
    title: "Tu ruta se dibuja contigo",
    copy: "Cada señal de la entrevista agrega nodos y conexiones a un mapa de dominios que puedes ver y cuestionar.",
  },
  {
    icon: RefreshCw,
    title: "Cambia cuando tú cambias",
    copy: "Si una evaluación revela una brecha, la ruta se recalibra y te explica exactamente por qué, sin castigos ni confeti.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="static-landing">
      <section className="static-landing__hero cp-section">
        <div className="cp-container static-landing__hero-inner">
          <img
            className="static-landing__wordmark"
            src="/brand/cloudpath-logo.svg"
            alt=""
            width={240}
            height={64}
          />
          <AnimatedHeadline />
          <p>
            Habla con un mentor, descubre qué dominas y recibe un plan que
            cambia contigo.
          </p>
          <Link className="button button-primary" to="/interview">
            Diseñar mi ruta
          </Link>
          <span className="meta">
            La entrevista dura menos de cinco minutos · sin registro
          </span>
        </div>
      </section>

      <section
        className="cp-section static-landing__demo"
        aria-labelledby="landing-demo-title"
      >
        <div className="cp-container">
          <div className="static-landing__demo-heading">
            <p className="eyebrow">El recorrido</p>
            <h2 id="landing-demo-title">Un solo camino, paso a paso.</h2>
          </div>
          <figure className="static-landing__demo-frame">
            <video
              className="static-landing__demo-video"
              controls
              playsInline
              preload="metadata"
              poster="/media/cloudpath-onboarding-poster.jpg"
              aria-label="Video de introducción a CloudPath"
            >
              <source
                src="/media/cloudpath-onboarding.mp4"
                type="video/mp4"
              />
              Tu navegador no puede reproducir este video.
            </video>
            <figcaption className="static-landing__demo-caption">
              <span className="meta">
                Mira cómo funciona · recorrido completo
              </span>
              <span className="meta">00:26</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="cp-section static-landing__certification">
        <div className="cp-container">
          <div className="panel panel-elevated">
            <p className="eyebrow">Certificación activa</p>
            <h2>AWS Certified Cloud Practitioner</h2>
            <span className="pill pill-green">Disponible</span>
            <p>
              Es la certificación disponible hoy. Otras certificaciones AWS
              llegarán después; preferimos decirlo claro antes que prometer de
              más.
            </p>
          </div>
        </div>
      </section>

      <section className="cp-section static-landing__steps">
        <div className="cp-container">
          <p className="eyebrow">Cómo funciona</p>
          <div className="static-landing__step-grid">
            {steps.map(({ icon: Icon, title, copy }, index) => (
              <article key={title}>
                <span className="static-landing__step-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="static-landing__step-icon" aria-hidden="true">
                  <Icon size={24} strokeWidth={1.75} />
                </span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cp-section static-landing__principles">
        <div className="cp-container">
          <div className="panel">
            <p className="eyebrow">Lo que prometemos, y lo que no</p>
            <div className="static-landing__promise-list">
              <span className="pill pill-cyan">Preparación personalizada</span>
              <span className="pill pill-cyan">Ruta basada en evidencia</span>
              <span className="pill pill-cyan">
                Contenido conectado a fuentes oficiales
              </span>
            </div>
            <p>
              Nunca afirmamos que aprobarás el examen ni predecimos tu
              calificación. CloudPath es software de código abierto: puedes
              revisar cómo funciona.
            </p>
          </div>
        </div>
      </section>

      <section className="cp-section static-landing__closing">
        <div className="cp-container">
          <h2>Cinco minutos de conversación. Un plan que puedes ver.</h2>
          <p>
            La entrevista dura menos de cinco minutos y siempre puedes
            responder por texto.
          </p>
          <Link className="button button-primary" to="/interview">
            Diseñar mi ruta
          </Link>
        </div>
      </section>
    </div>
  );
}
