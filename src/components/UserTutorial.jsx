import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Disc3,
  Download,
  Images,
  Palette,
  Sparkles,
} from "lucide-react";

const tutorialSteps = [
  {
    title: "Welcome to ThePhoto's.",
    description:
      "A little retro photo studio for keeping four moments, or however many you choose, close.",
    icon: Sparkles,
  },
  {
    title: "Choose Your Photo Session.",
    description:
      "Choose one to four photos before opening the camera. Your selection locks once the capture session begins.",
    icon: Images,
  },
  {
    title: "Set Your Music.",
    description:
      "If music is available, pick a favorite and use the player controls. Music is optional, and the vinyl follows playback.",
    icon: Disc3,
  },
  {
    title: "Open Your Camera.",
    description:
      "Choose OPEN CAMERA when you're ready. Your browser asks for camera permission then, and closing the camera window stops the preview.",
    icon: Camera,
  },
  {
    title: "Capture Your Moments.",
    description:
      "Follow the countdown for each photo. When the session is complete, review your results and retake individual photos if needed.",
    icon: Camera,
  },
  {
    title: "Customize Your Photo Strip.",
    description:
      "Choose paper and a film look, then fine-tune your photos, caption, layout, and export settings.",
    icon: Palette,
  },
  {
    title: "Review & Download Your Photos.",
    description:
      "Open VIEW PHOTO to inspect the final strip, then download a PNG at your preferred resolution. WhatsApp and email delivery are coming soon.",
    icon: Download,
  },
];

export default function UserTutorial({ open, onFinish, returnFocusRef }) {
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;
  const step = tutorialSteps[stepIndex];
  const StepIcon = step.icon;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    dialog?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onFinish();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll(
          "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => !element.closest("[hidden]"));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === focusable[0] ||
          document.activeElement === dialog)
      ) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === focusable.at(-1)
      ) {
        event.preventDefault();
        focusable[0].focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => {
        if (!openRef.current) {
          (returnFocusRef?.current || previousFocus)?.focus?.();
        }
      });
    };
  }, [open, onFinish, returnFocusRef]);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  if (!open) return null;

  const isLastStep = stepIndex === tutorialSteps.length - 1;
  return (
    <div className="tutorial-backdrop">
      <section
        ref={dialogRef}
        className="tutorial-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
        tabIndex={-1}
      >
        <div className="tutorial-topline">
          <span className="section-kicker">A LITTLE GUIDE TO THE STUDIO</span>
          <button type="button" className="tutorial-skip" onClick={onFinish}>
            SKIP
          </button>
        </div>

        <div className="tutorial-progress-copy" aria-live="polite">
          Step {stepIndex + 1} of {tutorialSteps.length}
        </div>
        <div
          className="tutorial-progress-track"
          role="progressbar"
          aria-label="Tutorial progress"
          aria-valuemin={1}
          aria-valuemax={tutorialSteps.length}
          aria-valuenow={stepIndex + 1}
        >
          <span
            style={{
              width: `${((stepIndex + 1) / tutorialSteps.length) * 100}%`,
            }}
          />
        </div>

        <div className="tutorial-step-content" key={stepIndex}>
          <div className="tutorial-step-icon" aria-hidden="true">
            <StepIcon size={28} strokeWidth={1.5} />
          </div>
          <div className="section-kicker">
            STEP {String(stepIndex + 1).padStart(2, "0")}
          </div>
          <h2 id="tutorial-title">{step.title}</h2>
          <p id="tutorial-description">{step.description}</p>
        </div>

        <div className="tutorial-navigation">
          <button
            type="button"
            className="secondary-button tutorial-back-button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
          >
            <ArrowLeft size={15} />
            BACK
          </button>
          {isLastStep ? (
            <button
              type="button"
              className="primary-button tutorial-next-button"
              onClick={onFinish}
            >
              GET STARTED
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="primary-button tutorial-next-button"
              onClick={() =>
                setStepIndex((current) =>
                  Math.min(tutorialSteps.length - 1, current + 1),
                )
              }
            >
              NEXT
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
