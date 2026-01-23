"use client";
import type { FormProps } from "antd";
import { Button, Form, Input } from "antd";
import Image from "next/image";
import Link from "next/link";
interface FieldType {
  username?: string;
  password?: string;
  remember?: string;
}

const page = () => {
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
          <Link href={"/"}>Back Home</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
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
          <div className="">
            <Form
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              style={{ maxWidth: 600 }}
              initialValues={{ remember: true }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
              className="bg-[#07140D] p-6! rounded-xl"
              layout="vertical"
            >
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Please input your email!" },
                ]}
              >
                <Input
                  className="bg-[#0B1A15]! hover:border-[#0EC971]! focus:border-[#0EC971]!"
                  placeholder="Your email"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: "Please input your password!" },
                ]}
              >
                <Input.Password
                  className="bg-[#0B1A15]! hover:border-[#0EC971]! focus-within:border-[#0EC971]!"
                  placeholder="Your password"
                  size="large"
                />
              </Form.Item>

              {/* <Form.Item name="remember" valuePropName="checked">
                <Checkbox>Remember me</Checkbox>
              </Form.Item> */}

              <Form.Item>
                <Button
                  type="primary"
                  className="bg-[#0EC971]!"
                  htmlType="submit"
                >
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default page;
