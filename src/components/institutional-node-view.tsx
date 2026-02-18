"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Server,
  Activity,
  Wallet,
  Users,
  ImageIcon,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { NodeHealth, NodeStats, NodeTransaction } from "@/lib/data";
import {
  getNodeInfo,
  getNodeStats,
  getRecentTransactions,
} from "@/lib/institutional-node";

const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  valueColor,
}: {
  title: string;
  value: string;
  subtext?: string;
  icon?: React.ElementType;
  valueColor?: string;
}) => (
  <Card className="shadow-sm">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </div>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </CardContent>
  </Card>
);

export function InstitutionalNodeView() {
  const [nodeHealth, setNodeHealth] = useState<NodeHealth | null>(null);
  const [nodeStats, setNodeStats] = useState<NodeStats | null>(null);
  const [transactions, setTransactions] = useState<NodeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthData, statsData, txData] = await Promise.all([
        getNodeInfo(),
        getNodeStats(),
        getRecentTransactions(20),
      ]);

      setNodeHealth(healthData);
      setNodeStats(statsData);
      setTransactions(txData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch node data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodeData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNodeData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: NodeHealth["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "down":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: NodeHealth["status"]) => {
    const variants = {
      healthy:
        "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
      warning:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
      down: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    };

    return (
      <Badge variant="outline" className={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSUI = (amount: number) => {
    return `${amount.toFixed(4)} SUI`;
  };

  if (error) {
    return (
      <section className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">
            Institutional Node Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor gas sponsorship and transaction activity
          </p>
        </header>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Institutional Node Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor gas sponsorship and transaction activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Live updates every 30s
          </span>
        </div>
      </header>

      {/* Node Health Status */}
      {loading && !nodeHealth ? (
        <Card className="shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : (
        nodeHealth && (
          <Card className="shadow-sm border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Node Status
                </CardTitle>
                {getStatusIcon(nodeHealth.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {getStatusBadge(nodeHealth.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Network</p>
                  <p className="font-mono text-sm font-semibold">
                    {nodeHealth.network}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Sponsor Address
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {formatAddress(nodeHealth.sponsorAddress)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Agency</p>
                  <p className="text-sm font-semibold">
                    {nodeHealth.agencyName || "Not Set"}
                  </p>
                  {nodeHealth.agencyId && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {nodeHealth.agencyId}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading && !nodeStats ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          nodeStats && (
            <>
              <StatCard
                title="Total Transactions"
                value={nodeStats.totalTransactions.toString()}
                subtext="All sponsored transactions"
                icon={Activity}
                valueColor="#4da2ff"
              />
              <StatCard
                title="Gas Spent"
                value={formatSUI(nodeStats.gasSpent)}
                subtext={`Avg: ${formatSUI(nodeStats.avgCostPerTx)} per tx`}
                icon={Wallet}
                valueColor="#32629b"
              />
              <StatCard
                title="Media Anchored"
                value={nodeStats.mediaAnchored.toString()}
                subtext="Original content pieces"
                icon={ImageIcon}
                valueColor="#10b981"
              />
              <StatCard
                title="Active Journalists"
                value={nodeStats.activeJournalists.toString()}
                subtext="With press passes"
                icon={Users}
                valueColor="#8b5cf6"
              />
            </>
          )
        )}
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && transactions.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Sponsored transactions will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Journalist</TableHead>
                    <TableHead>Gas Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">
                        {formatTimestamp(tx.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            tx.type === "anchor"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : tx.type === "press-pass"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300"
                          }
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatAddress(tx.journalist)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatSUI(tx.gasCost)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === "success"
                              ? "default"
                              : tx.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <a
                          href={`https://suiscan.xyz/${nodeHealth?.network || "testnet"}/tx/${tx.txDigest}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {formatAddress(tx.txDigest)}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
