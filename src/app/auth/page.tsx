"use client";
import Image from "next/image";
import Link from "next/link";
import type { FormProps } from "antd";
import { Button, Checkbox, Form, Input } from "antd";
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
    <section>
      <div>
        <h1>Authentication System</h1>
        <Link href={"/"}>Back Home</Link>
      </div>
      <div className="flex">
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
        <div className="text-white!">
          <Form
            name="basic"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            style={{ maxWidth: 600, color: "white" }}
            initialValues={{ remember: true }}
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            autoComplete="off"
          >
            <Form.Item
              label="Username"
              name="username"
              className="text-white!"
              rules={[
                { required: true, message: "Please input your username!" },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="remember"
              valuePropName="checked"
              label={null}
            >
              <Checkbox>Remember me</Checkbox>
            </Form.Item>

            <Form.Item label={null}>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </section>
  );
};

export default page;
