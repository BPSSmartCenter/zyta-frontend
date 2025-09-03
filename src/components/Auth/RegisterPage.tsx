// src/components/Auth/RegisterPage.tsx
import { useState } from "react";
import brandImage from "../../assets/brand.png";
import { Link } from "react-router-dom";

interface RegisterPageProps {
  onSubmit?: (email: string, password: string, confirmPassword: string) => void;
}

export default function RegisterPage({ onSubmit }: RegisterPageProps) {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // --- Validators ---
  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const emailInvalid = emailTouched && !isEmailValid(email);

  const passMin = password.length >= 10;
  const passComplex =
    /[0-9]/.test(password) && /[A-Z]/.test(password) && /[a-z]/.test(password);

  const confirmOk = confirmPassword === password && password.length > 0;

  const formValid =
    isEmailValid(email) && passMin && passComplex && confirmOk && termsAccepted;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    onSubmit?.(email, password, confirmPassword);
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

        {/* Title (คง UI เดิม) */}
        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-center select-none">
          Log in to your account
        </h1>
        <span className="mt-3 mb-6 text-center text-sm sm:text-base select-none">
          Welcome back! Please enter your details.
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
              Email
            </label>
            <input
              className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              {...(emailInvalid
                ? { "aria-invalid": "true", "aria-describedby": "email-error" }
                : {})}
            />
            {/* กัน layout ขยับ */}
            <div className="h-[10px] mt-[-4px]" aria-live="polite">
              {emailInvalid && (
                <span
                  id="email-error"
                  className="select-none text-[#EC0357] text-[12px]"
                >
                  Email is invalid
                </span>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="flex gap-1 flex-col mt-4 w-full">
            <label>Password</label>
            <input
              className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Confirm Password */}
            <div className="flex gap-1 flex-col mt-4 w-full">
              <label>Confirm Password</label>
              <input
                className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
                type="password"
                placeholder="confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {/* ข้อความเงื่อนไขใต้ Password (2 บรรทัดพร้อมไอคอน) */}
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
                <span>มีอย่างน้อย 10 ตัวอักษร</span>
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
                <span>ประกอบด้วยตัวเลข ตัวพิมพ์ใหญ่ และตัวพิมพ์เล็ก</span>
              </div>
            </div>
          </div>

          {/* Terms (แทน Remember for 30 days) */}
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
                <span>ฉันตกลงและยอมรับเงื่อนไขการใช้งาน</span>
              </label>
            </div>
            {/* คงตำแหน่งเดิม */}
            <div />
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-3 mt-6">
            <button
              className="bg-cyan w-full font-bold text-white px-4 py-2 rounded-sm hover:bg-blue hover:cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              disabled={!formValid} // ✅ dim & ปิดเมื่อยังไม่ผ่านทุกเงื่อนไข
            >
              Sign up
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-6 text-sm sm:text-base">
            <span>You have an account?</span>
            <Link
              to="/"
              className="text-cyan font-bold hover:cursor-pointer hover:text-blue"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
