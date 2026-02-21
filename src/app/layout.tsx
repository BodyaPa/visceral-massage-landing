import "../styles/global.scss";
import HeaderComponent from "@/components/layout/header/HeaderComponent";
import Providers from "./providers";

export default function RootLayout({children,}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <HeaderComponent />
                <Providers>{children}</Providers>
                {/*<FooterComponent />*/}
            </body>
        </html>
    );
}