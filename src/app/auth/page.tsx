"use client";
import { cn } from "@/src/@libs/utils/cn";
import type { FormProps } from "antd";
import { Button, Col, Form, Input, Row } from "antd";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FaArrowRightLong } from "react-icons/fa6";
interface FieldType {
  username?: string;
  password?: string;
  remember?: string;
}

const page = () => {
  const [authTab, setAuthTab] = useState("signUp");
  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    console.log("Success:", values);
  };

  const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (
    errorInfo,
  ) => {
    console.log("Failed:", errorInfo);
  };
  return (
    <section className="">
      <div className="container">
        <div className="flex justify-between items-center py-10 border-b border-gray-500">
          <h1 className="text-3xl font-semibold">Authentication System</h1>
          <Link href={"/"} className="flex items-center gap-2 text-[#0EC971]! font-semibold hover:underline">
            <span className="text-lg">Back Home</span> <FaArrowRightLong size={16} />
          </Link>
        </div>
        <div className=" grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
          <div>
            <Image
              src={
                "https://i.ibb.co.com/M5SHd6QK/user-typing-login-passwordhand-man-use-mobile-phone-log-enter-login-passwordsign-pageuser-profileinf.jpg"
              }
              alt="Auth Images"
              width={500}
              height={500}
              className="w-full h-full"
            />
          </div>
          <div className="max-w-lg mx-auto h-fit bg-[#07140D] p-6! rounded-3xl border border-[#084d2c]">
            <div className="flex justify-between items-center">
              <div className="my-6">
                <h1 className="uppercase text-kg font-semibold text-[#084d2c]">
                  Credentials
                </h1>
                <p className="text-xl font-semibold">
                  {authTab === "signIn"
                    ? "Sign in to your account"
                    : "Create a new account"}
                </p>
              </div>
              <div className="flex justify-center items-center gap-1 bg-[#1B251F] rounded-full p-1 border border-gray-600">
                {["signIn", "signUp"].map((tab) => (
                  <Button
                    key={tab}
                    onClick={() => setAuthTab(tab)}
                    className={cn(
                      "px-6 py-1 rounded-3xl! border-none!  capitalize duration-300 ease-linear bg-transparent! hover:text-white! font-semibold!",
                      {
                        "bg-[#15573C]!": authTab === tab,
                      },
                    )}
                  >
                    {tab === "signIn" ? "Sign In" : "Sign Up"}
                  </Button>
                ))}
              </div>
            </div>
            <Form
              name="sign-in"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
              layout="vertical"
            >
              <Row gutter={16}>
                <Col sm={24}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: "Please input your email!" },
                    ]}
                    className=""
                  >
                    <Input
                      className="w-full! bg-[#0B1A15]! hover:border-[#0EC971]! focus:border-[#0EC971]! rounded-xl!"
                      placeholder="Your email"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col sm={24}>
                  <Form.Item
                    label="Password"
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: "Please input your password!",
                      },
                    ]}
                    className=""
                  >
                    <Input.Password
                      className="bg-[#0B1A15]! hover:border-[#0EC971]! focus-within:border-[#0EC971]! rounded-xl!"
                      placeholder="Your password"
                      size="large"
                    />
                  </Form.Item>
                </Col>

                {/* <Form.Item name="remember" valuePropName="checked">
                <Checkbox>Remember me</Checkbox>
              </Form.Item> */}
                <Col sm={24}>
                  <Form.Item>
                    <Button
                      type="primary"
                      className="w-full bg-[#0EC971]! rounded-full! text-lg! font-semibold "
                      htmlType="submit"
                    >
                      Create account
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default page;
