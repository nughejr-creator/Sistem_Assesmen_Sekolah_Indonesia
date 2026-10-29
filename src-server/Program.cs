using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Diagnostics;

namespace SasiCbtServer
{
    class Program
    {
        private static int port = 8080;
        private static string webRoot = "";
        private static volatile bool isRunning = true;
        private static ManualResetEvent exitEvent = new ManualResetEvent(false);

        private static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".html", "text/html; charset=utf-8" },
            { ".htm",  "text/html; charset=utf-8" },
            { ".js",   "application/javascript; charset=utf-8" },
            { ".mjs",  "application/javascript; charset=utf-8" },
            { ".css",  "text/css; charset=utf-8" },
            { ".json", "application/json; charset=utf-8" },
            { ".png",  "image/png" },
            { ".jpg",  "image/jpeg" },
            { ".jpeg", "image/jpeg" },
            { ".gif",  "image/gif" },
            { ".svg",  "image/svg+xml" },
            { ".ico",  "image/x-icon" },
            { ".woff", "font/woff" },
            { ".woff2","font/woff2" },
            { ".ttf",  "font/ttf" },
            { ".eot",  "application/vnd.ms-fontobject" },
            { ".otf",  "font/otf" },
            { ".txt",  "text/plain; charset=utf-8" },
            { ".xml",  "application/xml; charset=utf-8" },
            { ".pdf",  "application/pdf" },
            { ".wasm", "application/wasm" }
        };

        static void Main(string[] args)
        {
            try
            {
                Console.Title = "SASI CBT Indonesia - Server Proktor Portable";
                Console.OutputEncoding = Encoding.UTF8;
            }
            catch { }

            // Determine webRoot
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            if (Directory.Exists(Path.Combine(exeDir, "dist")))
            {
                webRoot = Path.Combine(exeDir, "dist");
            }
            else if (Directory.Exists(Path.Combine(exeDir, "wwwroot")))
            {
                webRoot = Path.Combine(exeDir, "wwwroot");
            }
            else if (File.Exists(Path.Combine(exeDir, "index.html")))
            {
                webRoot = exeDir;
            }
            else
            {
                webRoot = exeDir;
            }

            // Port argument override
            if (args.Length > 0)
            {
                int p;
                if (int.TryParse(args[0], out p)) port = p;
            }

            TcpListener listener = null;
            while (port < 8100)
            {
                try
                {
                    listener = new TcpListener(IPAddress.Any, port);
                    listener.Start();
                    break;
                }
                catch
                {
                    port++;
                }
            }

            if (listener == null)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Gagal membuka port jaringan (8080-8100). Pastikan firewall tidak memblokir.");
                Console.ResetColor();
                return;
            }

            List<string> ipList = GetLocalIPv4List();

            // Print Banner
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("================================================================================");
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("        SISTEM ASESMEN SEKOLAH INDONESIA (SASI CBT) - SERVER PROKTOR           ");
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("                   MODA SEMI-ONLINE / SERVER LOKAL RUANG UJIAN                  ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("================================================================================");
            Console.ResetColor();

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("  Folder Web Root : " + webRoot);
            Console.WriteLine("  Port Server     : " + port);
            Console.WriteLine("  Status Server   : AKTIF & SIAP DIGUNAKAN (0 Kuota Internet untuk Tampilan)");
            Console.ResetColor();
            Console.WriteLine();

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("  ----------------------------------------------------------------------------");
            Console.WriteLine("   BAGIKAN ALAMAT INI KEPADA SISWA DI KELAS / LAB (TULIS DI PAPAN TULIS):    ");
            Console.WriteLine("  ----------------------------------------------------------------------------");
            Console.ForegroundColor = ConsoleColor.Yellow;
            
            if (ipList.Count == 0)
            {
                Console.WriteLine("   >> http://localhost:" + port);
            }
            else
            {
                foreach (string ip in ipList)
                {
                    Console.WriteLine("   >> http://" + ip + ":" + port);
                }
            }
            
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("  ----------------------------------------------------------------------------");
            Console.ResetColor();

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine("  Tips Proktor:");
            Console.WriteLine("  * Siswa di HP atau Laptop cukup membuka Chrome dan mengetik alamat di atas.");
            Console.WriteLine("  * Jangan menutup jendela ini selama pelaksanaan asesmen berlangsung.");
            Console.WriteLine("  * Tekan tombol [B] untuk membuka browser di laptop ini, atau [X] untuk keluar.");
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("  [LOG MONITORING PERANGKAT SISWA AKAN TAMPIL DI BAWAH SECARA REAL-TIME]");
            Console.WriteLine("================================================================================");
            Console.ResetColor();

            // Handle Ctrl+C
            Console.CancelKeyPress += (sender, e) =>
            {
                e.Cancel = true;
                isRunning = false;
                exitEvent.Set();
            };

            // Start Accept Thread
            Thread serverThread = new Thread(() =>
            {
                while (isRunning)
                {
                    try
                    {
                        TcpClient client = listener.AcceptTcpClient();
                        ThreadPool.QueueUserWorkItem(HandleClient, client);
                    }
                    catch
                    {
                        if (!isRunning) break;
                    }
                }
            });
            serverThread.IsBackground = true;
            serverThread.Start();

            // Interactive loop with fail-safe for redirected console
            bool isRedirected = true;
            try
            {
                isRedirected = Console.IsInputRedirected;
            }
            catch { }

            if (!isRedirected)
            {
                while (isRunning)
                {
                    try
                    {
                        if (Console.KeyAvailable)
                        {
                            ConsoleKeyInfo key = Console.ReadKey(true);
                            if (key.Key == ConsoleKey.X)
                            {
                                isRunning = false;
                                break;
                            }
                            else if (key.Key == ConsoleKey.B)
                            {
                                string bestIp = ipList.Count > 0 ? ipList[0] : "localhost";
                                try { Process.Start(new ProcessStartInfo("http://" + bestIp + ":" + port) { UseShellExecute = true }); } catch { }
                            }
                        }
                    }
                    catch
                    {
                        break;
                    }
                    Thread.Sleep(100);
                }
            }
            else
            {
                exitEvent.WaitOne();
            }

            try { listener.Stop(); } catch { }
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("Server telah dinonaktifkan. Terima kasih.");
            Console.ResetColor();
        }

        private static List<string> GetLocalIPv4List()
        {
            List<string> list = new List<string>();
            try
            {
                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus != OperationalStatus.Up) continue;
                    if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;

                    IPInterfaceProperties ipProps = ni.GetIPProperties();
                    foreach (UnicastIPAddressInformation addr in ipProps.UnicastAddresses)
                    {
                        if (addr.Address.AddressFamily == AddressFamily.InterNetwork)
                        {
                            string s = addr.Address.ToString();
                            if (!s.StartsWith("127.") && !s.StartsWith("169.254."))
                            {
                                list.Add(s);
                            }
                        }
                    }
                }
            }
            catch { }
            return list;
        }

        private static void HandleClient(object obj)
        {
            TcpClient client = (TcpClient)obj;
            try
            {
                client.ReceiveTimeout = 5000;
                client.SendTimeout = 10000;

                using (NetworkStream stream = client.GetStream())
                {
                    byte[] buffer = new byte[8192];
                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead <= 0) return;

                    string requestHeader = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    string[] lines = requestHeader.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                    if (lines.Length == 0) return;

                    string requestLine = lines[0];
                    string[] parts = requestLine.Split(' ');
                    if (parts.Length < 2) return;

                    string method = parts[0];
                    string rawUrl = parts[1];

                    // Remove query string
                    int qIdx = rawUrl.IndexOf('?');
                    string path = (qIdx >= 0) ? rawUrl.Substring(0, qIdx) : rawUrl;
                    path = Uri.UnescapeDataString(path);

                    if (path == "/" || string.IsNullOrEmpty(path))
                    {
                        path = "/index.html";
                    }

                    // Prevent directory traversal
                    path = path.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
                    if (path.Contains(".."))
                    {
                        SendResponse(stream, 403, "text/plain", Encoding.UTF8.GetBytes("Forbidden"));
                        return;
                    }

                    string filePath = Path.Combine(webRoot, path);

                    // If file doesn't exist, fallback to index.html for SPA router
                    if (!File.Exists(filePath))
                    {
                        filePath = Path.Combine(webRoot, "index.html");
                    }

                    if (!File.Exists(filePath))
                    {
                        SendResponse(stream, 404, "text/plain", Encoding.UTF8.GetBytes("File index.html tidak ditemukan di " + webRoot));
                        return;
                    }

                    string ext = Path.GetExtension(filePath);
                    string mime;
                    if (!MimeTypes.TryGetValue(ext, out mime))
                    {
                        mime = "application/octet-stream";
                    }

                    byte[] content = File.ReadAllBytes(filePath);
                    SendResponse(stream, 200, mime, content);

                    // Log only HTML requests to keep console informative without spamming for assets
                    if (ext == ".html")
                    {
                        string clientIp = ((IPEndPoint)client.Client.RemoteEndPoint).Address.ToString();
                        Console.ForegroundColor = ConsoleColor.DarkCyan;
                        Console.WriteLine("  [" + DateTime.Now.ToString("HH:mm:ss") + "] Perangkat Siswa Terhubung: " + clientIp);
                        Console.ResetColor();
                    }
                }
            }
            catch
            {
                // Client disconnected or timed out
            }
            finally
            {
                try { client.Close(); } catch { }
            }
        }

        private static void SendResponse(Stream stream, int statusCode, string contentType, byte[] body)
        {
            string statusMsg = statusCode == 200 ? "OK" : statusCode == 404 ? "Not Found" : "Forbidden";
            StringBuilder sb = new StringBuilder();
            sb.Append("HTTP/1.1 ").Append(statusCode).Append(" ").Append(statusMsg).Append("\r\n");
            sb.Append("Content-Type: ").Append(contentType).Append("\r\n");
            sb.Append("Content-Length: ").Append(body.Length).Append("\r\n");
            sb.Append("Connection: close\r\n");
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Cache-Control: public, max-age=3600\r\n");
            sb.Append("\r\n");

            byte[] headerBytes = Encoding.UTF8.GetBytes(sb.ToString());
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(body, 0, body.Length);
            stream.Flush();
        }
    }
}
