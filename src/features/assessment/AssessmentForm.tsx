import { ArrowRight, Gauge, Lightbulb } from "lucide-react";
import {
  type FormEvent,
  useRef,
  useState,
} from "react";

import type {
  AssessmentQuestion,
  Confidence,
} from "../../contracts/generated/contracts";

export interface AssessmentSubmission {
  optionIndex: number;
  confidence: Confidence;
}

interface AssessmentFormProps {
  question: AssessmentQuestion;
  onSubmit: (submission: AssessmentSubmission) => void;
}

interface ValidationErrors {
  answer?: string;
  confidence?: string;
}

export function AssessmentForm({
  question,
  onSubmit,
}: AssessmentFormProps) {
  const [optionIndex, setOptionIndex] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const answerGroup = useRef<HTMLFieldSetElement>(null);
  const confidenceGroup = useRef<HTMLFieldSetElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: ValidationErrors = {};
    if (optionIndex === null) {
      nextErrors.answer =
        "Elige la opción que mejor responde antes de comprobar.";
    }
    if (confidence === null) {
      nextErrors.confidence =
        "Indica tu nivel de confianza para registrar la señal completa.";
    }
    setErrors(nextErrors);

    if (nextErrors.answer) {
      answerGroup.current?.focus();
      return;
    }
    if (nextErrors.confidence) {
      confidenceGroup.current?.focus();
      return;
    }

    onSubmit({
      optionIndex: optionIndex as number,
      confidence: confidence as Confidence,
    });
  }

  return (
    <form className="assessment-form" onSubmit={submit} noValidate>
      <fieldset
        className="assessment-fieldset"
        ref={answerGroup}
        tabIndex={-1}
        aria-describedby={errors.answer ? "assessment-answer-error" : undefined}
        aria-invalid={Boolean(errors.answer)}
      >
        <legend>{question.prompt}</legend>
        <div className="assessment-options">
          {question.options.map((option, index) => (
            <label className="assessment-option" key={option}>
              <input
                type="radio"
                name="answer"
                value={index}
                checked={optionIndex === index}
                onChange={() => {
                  setOptionIndex(index);
                  setErrors((current) => ({
                    ...current,
                    answer: undefined,
                  }));
                }}
              />
              <span className="assessment-option__index" aria-hidden="true">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </label>
          ))}
        </div>
        {errors.answer ? (
          <p className="assessment-error" id="assessment-answer-error" role="alert">
            {errors.answer}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        className="confidence-fieldset"
        ref={confidenceGroup}
        tabIndex={-1}
        aria-describedby={
          errors.confidence ? "assessment-confidence-error" : undefined
        }
        aria-invalid={Boolean(errors.confidence)}
      >
        <legend>
          <Gauge aria-hidden="true" size={18} strokeWidth={1.75} />
          ¿Qué tan seguro estás?
        </legend>
        <p>
          No cambia si acertaste. Nos ayuda a distinguir una duda de un modelo
          mental que debemos recalibrar.
        </p>
        <div className="confidence-options">
          <label>
            <input
              type="radio"
              name="confidence"
              value="high"
              checked={confidence === "high"}
              onChange={() => {
                setConfidence("high");
                setErrors((current) => ({
                  ...current,
                  confidence: undefined,
                }));
              }}
            />
            <span>
              <strong>Estoy seguro</strong>
              <small>Podría explicar por qué.</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="confidence"
              value="low"
              checked={confidence === "low"}
              onChange={() => {
                setConfidence("low");
                setErrors((current) => ({
                  ...current,
                  confidence: undefined,
                }));
              }}
            />
            <span>
              <strong>No estoy seguro</strong>
              <small>Elegí con alguna duda.</small>
            </span>
          </label>
        </div>
        {errors.confidence ? (
          <p
            className="assessment-error"
            id="assessment-confidence-error"
            role="alert"
          >
            {errors.confidence}
          </p>
        ) : null}
      </fieldset>

      <div className="assessment-submit">
        <p>
          <Lightbulb aria-hidden="true" size={16} />
          La ruta usa respuesta + confianza para decidir el siguiente paso.
        </p>
        <button className="button button-primary" type="submit">
          Comprobar respuesta
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    </form>
  );
}
