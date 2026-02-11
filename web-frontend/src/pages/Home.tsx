import Layout from "../components/layout/Layout";
import Feed from "../components/feed/Feed";

export default function Home() {
  return (
    <Layout>
      <div className="px-2 pt-8">
        <Feed />
      </div>
    </Layout>
  );
}
