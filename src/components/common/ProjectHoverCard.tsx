import { type NDKProject } from "@nostr-dev-kit/ndk-hooks";
import { Circle, FolderOpen, Users } from "lucide-react";
import { useProjectAgents } from "../../stores/project";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import { ProjectAvatarUtils } from "@/lib/utils/business";

interface ProjectHoverCardProps {
    project: NDKProject;
    isOnline: boolean;
    children: React.ReactNode;
}

export function ProjectHoverCard({ project, isOnline, children }: ProjectHoverCardProps) {
    const title = project.title || project.tagValue("title") || "Untitled Project";
    const description = project.content || project.tagValue("summary") || "";
    const projectDir = project.tagValue("d") || "";
    const agents = useProjectAgents(project.tagId());

    return (
        <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>
                {children}
            </HoverCardTrigger>
            <HoverCardContent side="right" className="w-80">
                <div className="flex flex-col space-y-3">
                    {/* Header */}
                    <div className="flex items-start space-x-3">
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={ProjectAvatarUtils.getAvatar(project)} alt={title} />
                            <AvatarFallback
                                className={`text-primary-foreground font-semibold ${ProjectAvatarUtils.getColors(title)}`}
                            >
                                {ProjectAvatarUtils.getInitials(title)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-sm truncate">{title}</h3>
                                <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
                                    <Circle className={`w-2 h-2 mr-1 ${isOnline ? "text-green-500 fill-green-500" : "text-gray-400 fill-gray-400"}`} />
                                    {isOnline ? "Online" : "Offline"}
                                </Badge>
                            </div>
                            {projectDir && (
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                                    <FolderOpen className="w-3 h-3" />
                                    <span className="truncate">{projectDir}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {description && (
                        <div className="text-sm text-muted-foreground">
                            <p className="line-clamp-3">{description}</p>
                        </div>
                    )}

                    {/* Agents */}
                    {agents.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center space-x-1 text-xs font-medium">
                                <Users className="w-3 h-3" />
                                <span>Agents ({agents.length})</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {agents.slice(0, 3).map((agent) => (
                                    <Badge key={agent.pubkey} variant="outline" className="text-xs">
                                        {agent.name}
                                    </Badge>
                                ))}
                                {agents.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                        +{agents.length - 3} more
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </HoverCardContent>
        </HoverCard>
    );
}