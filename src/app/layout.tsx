import "@/styles/global.scss";
import HeaderComponent from "@/app/components/header/HeaderComponent";

export default function RootLayout({children,}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <HeaderComponent />
                <main>{children}</main>
                {/*<FooterComponent />*/}
            </body>
        </html>
    );
}