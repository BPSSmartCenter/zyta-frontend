import React from "react";
import brandImage from "../assets/brand.png";

type Props = {};

export default function Login({}: Props) {
  return (
    <>
      <div className="flex justify-center items-center w-screen h-screen bg-purple-300">
        <div className="flex-col flex-2 px-10 w-full h-full bg-white flex justify-center items-center">
          <div>
            <img className="w-[120px] h-[120px]" src={brandImage} alt="" />
          </div>
          <h1 className="text-[32px] text-blue font-bold">Welcome back!</h1>
          <form className="flex flex-col w-full justify-center items-center">
            <div className="flex gap-1 flex-col mt-4 w-full">
              <label>Email</label>
              <input
                className="border border-gray-500 pl-1 h-[40px] rounded-sm"
                type="email"
              />
            </div>
            <div className="flex gap-1 flex-col mt-4 w-full">
              <label>Password</label>
              <input
                className="border border-gray-500 pl-1 h-[40px] rounded-sm"
                type="password"
              />
            </div>
            <div className="flex justify-between items-center w-full mt-4">
              <div className="flex items-center">
                <label
                  htmlFor="remember"
                  className="flex items-center gap-2 cursor-pointer select-none relative"
                >
                  <input
                    id="remember"
                    type="checkbox"
                    name="remember"
                    className="peer appearance-none w-[16px] h-4 border rounded-sm bg-white checked:bg-cyan-500 checked:border-cyan-500 focus:outline-none"
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
                  <span className="">Remember me</span>
                </label>
              </div>
              <div>
                <a href="#" className="text-cyan font-bold hover:text-blue">
                  Forgot password?
                </a>
              </div>
            </div>
            <div className="w-full h-[40px] flex justify-center items-center mt-3">
              <button className="bg-cyan w-full font-bold text-white px-4 py-2 mt-4 rounded-sm hover:bg-blue hover:cursor-pointer">
                Sign in
              </button>
            </div>
            <div className="flex flex-col items-center mt-6">
              <p>Don't have an account?</p>
              <button className="text-cyan font-bold mt-2 hover:cursor-pointer hover:text-blue">
                Sign up
              </button>
            </div>
          </form>
        </div>
        <div className="flex-5 h-full w-full bg-blue"> </div>
      </div>
    </>
  );
}
