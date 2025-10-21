// src/components/Auth/RegisterPage.tsx
import { useState } from "react";
import brandImage from "../../assets/brand.png";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface RegisterPageProps {
  onSubmit?: (
    email: string,
    password: string,
    confirmPassword: string,
    extras?: { firstName: string; lastName: string }
  ) => void;
  serverEmailError?: string;
  onChangeEmail?: () => void;
  submitLabel?: string;
  submitting?: boolean;
}

export default function RegisterPage({
  onSubmit,
  serverEmailError,
  onChangeEmail,
  submitLabel,
}: RegisterPageProps) {
  const { t } = useTranslation(["signup"]); // ใช้ namespace 'signup'

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [firstTouched, setFirstTouched] = useState(false);
  const [lastName, setLastName] = useState("");
  const [lastTouched, setLastTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // --- Validators ของ Email ---
  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const emailInvalid = emailTouched && !isEmailValid(email);

  // --- Validators ของชื่อและนามสกุล ---
  const firstOk = firstName.trim().length > 0;
  const lastOk = lastName.trim().length > 0;

  const firstInvalid = firstTouched && !firstOk;
  const lastInvalid = lastTouched && !lastOk;

  const passMin = password.length >= 10;
  const passComplex =
    /[0-9]/.test(password) && /[A-Z]/.test(password) && /[a-z]/.test(password);

  const confirmOk = confirmPassword === password && password.length > 0;

  const formValid =
    isEmailValid(email) &&
    firstOk &&
    lastOk &&
    passMin &&
    passComplex &&
    confirmOk &&
    termsAccepted;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    onSubmit?.(email, password, confirmPassword, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  return (
    <div className="flex justify-center items-center w-screen h-screen px-4">
      <div
        className="
          flex-col flex justify-center items-center
          bg-white
          min-w-[300px] sm:min-w-[360px] md:min-w-[400px] lg:min-w-[450px]
          max-w-[90%] sm:max-w-[400px] md:max-w-[500px]
          rounded-lg p-6
        "
      >
        {/* Logo */}
        <div className="w-[140px] sm:w-[165px] h-[140px]">
          <img className="w-full h-auto" src={brandImage} alt="Brand" />
        </div>

        {/* Title */}
        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-center select-none">
          {t("title")}
        </h1>
        <span className="mt-3 mb-6 text-center text-sm sm:text-base select-none">
          {t("subtitle")}
        </span>

        {/* Form */}
        <form
          className="flex flex-col w-full"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Email */}
          <div className="flex gap-1 flex-col mt-4 w-full">
            <label className={emailInvalid ? "text-[#EC0357]" : ""}>
              {t("fields.email.label")}
            </label>
            <input
              className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
              type="email"
              placeholder={t("fields.email.placeholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                onChangeEmail?.();
              }}
              onBlur={() => setEmailTouched(true)}
              {...(emailInvalid
                ? { "aria-invalid": "true", "aria-describedby": "email-error" }
                : {})}
            />
            <div className="h-[10px] mt-[-4px]" aria-live="polite">
              {emailInvalid && (
                <span
                  id="email-error"
                  className="select-none text-[#EC0357] text-[12px]"
                >
                  {t("fields.email.invalid")}
                </span>
              )}
              {!emailInvalid && serverEmailError && (
                <span
                  id="email-error"
                  className="select-none text-[#EC0357] text-[12px]"
                >
                  {serverEmailError}
                </span>
              )}
            </div>
          </div>

          {/* FirstName - LastName */}
          <div className="flex gap-1 flex-col mt-4 w-full">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex flex-col">
                <label>{t("fields.firstName.label")}</label>
                <input
                  className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
                  type="text"
                  placeholder={t("fields.firstName.placeholder")}
                  value={firstName}
                  onBlur={() => setFirstTouched(true)}
                  onChange={(e) => setFirstName(e.target.value)}
                  {...(firstInvalid
                    ? {
                        "aria-invalid": "true",
                        "aria-describedby": "first-error",
                      }
                    : {})}
                />
                <div
                  className="h-[10px] mt-[4px] text-[12px] text-[#EC0357]"
                  aria-live="polite"
                >
                  {firstInvalid && (
                    <span id="first-error">
                      {t("fields.firstName.required")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <label>{t("fields.lastName.label")}</label>
                <input
                  className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
                  type="text"
                  placeholder={t("fields.lastName.placeholder")}
                  value={lastName}
                  onBlur={() => setLastTouched(true)}
                  onChange={(e) => setLastName(e.target.value)}
                  {...(lastInvalid
                    ? {
                        "aria-invalid": "true",
                        "aria-describedby": "last-error",
                      }
                    : {})}
                />
                <div
                  className="h-[10px] mt-[4px] text-[12px] text-[#EC0357]"
                  aria-live="polite"
                >
                  {lastInvalid && (
                    <span id="last-error">{t("fields.lastName.required")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="flex gap-1 flex-col mt-4 w-full">
            <label>{t("fields.password.label")}</label>
            <input
              className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
              type="password"
              placeholder={t("fields.password.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Confirm Password */}
            <div className="flex gap-1 flex-col mt-4 w-full">
              <label>{t("fields.confirm.label")}</label>
              <input
                className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
                type="password"
                placeholder={t("fields.confirm.placeholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                {...(!confirmOk && confirmPassword.length > 0
                  ? {
                      "aria-invalid": "true",
                      "aria-describedby": "confirm-error",
                    }
                  : {})}
              />
              <div className="h-[10px] mt-[-4px]" aria-live="polite">
                {!confirmOk && confirmPassword.length > 0 && (
                  <span
                    id="confirm-error"
                    className="select-none text-[#EC0357] text-[12px]"
                  >
                    {t("fields.confirm.mismatch")}
                  </span>
                )}
              </div>
            </div>

            {/* Password conditions */}
            <div className="mt-2 space-y-1 text-sm text-gray-700 select-none">
              <div className="flex items-center gap-2">
                <i
                  className={[
                    "material-icons-outlined checkIcon text-[18px]",
                    passMin ? "text-cyan-500" : "text-gray-400",
                  ].join(" ")}
                >
                  check_circle
                </i>
                <span>{t("requirements.minLen")}</span>
              </div>
              <div className="flex items-center gap-2">
                <i
                  className={[
                    "material-icons-outlined checkIcon text-[18px]",
                    passComplex ? "text-cyan-500" : "text-gray-400",
                  ].join(" ")}
                >
                  check_circle
                </i>
                <span>{t("requirements.complex")}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="flex justify-between items-center w-full mt-4 text-sm sm:text-base">
            <div className="flex items-center">
              <label
                htmlFor="terms"
                className="flex items-center gap-2 cursor-pointer select-none relative"
              >
                <input
                  id="terms"
                  type="checkbox"
                  name="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="peer appearance-none w-[16px] h-4 border rounded-sm bg-white checked:bg-cyan-500 checked:border-cyan-500 focus:outline-none focus:ring-0"
                />
                <svg
                  className="absolute left-[0px] top-[3px] w-[16px] h-4 opacity-0 peer-checked:opacity-100"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                >
                  <polyline points="5 11 9 15 15 6" />
                </svg>
                <span>{t("terms")}</span>
              </label>
            </div>
            <div />
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-3 mt-6">
            <button
              className="bg-cyan w-full font-bold text-white px-4 py-2 rounded-sm hover:bg-blue hover:cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              disabled={!formValid}
            >
              {submitLabel ?? t("actions.signup")}
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-6 text-sm sm:text-base">
            <span>{t("footer.have_account")}</span>
            <Link
              to="/"
              className="text-cyan font-bold hover:cursor-pointer hover:text-blue"
            >
              {t("actions.signin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
